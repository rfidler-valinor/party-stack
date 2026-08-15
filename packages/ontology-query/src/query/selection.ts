import type { OntologyIR } from "@party-stack/ontology";
import { resolveLink } from "../links/resolveLink.js";

/**
 * Normalized selection IR shared by fragments and query compilation.
 * Callers construct it with `fields(...)` and `related(...)`; they do not
 * author this representation directly.
 */
export type SelectionNode<Data = Record<string, unknown>> = {
    fields: string[];
    relations: Record<string, SelectionNode>;
    /** Type-only result carried through fragment/query inference. */
    readonly __data?: Data;
};

export type IncludeQuerySpec = {
    /** Root object type to query from. */
    from: string;
    /** Nested property + link selection. */
    select: SelectionNode;
};

export type OntologyQueryDefinition = {
    objectTypes: Record<string, Record<string, unknown>>;
    linkTypes: Record<
        string,
        Record<string, { target: string; cardinality: "one" | "many" }>
    >;
};

export type ObjectTypeName<Ontology extends OntologyQueryDefinition> = Extract<
    keyof Ontology["objectTypes"],
    string
>;

export type ObjectFieldName<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
> = Extract<keyof Ontology["objectTypes"][TypeName], string>;

export type LinkName<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
> = TypeName extends keyof Ontology["linkTypes"]
    ? Extract<keyof Ontology["linkTypes"][TypeName], string>
    : never;

type LinkDefinition<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
    Link extends LinkName<Ontology, TypeName>,
> = Ontology["linkTypes"][TypeName][Link] extends {
    target: infer Target extends ObjectTypeName<Ontology>;
    cardinality: infer Cardinality extends "one" | "many";
}
    ? { target: Target; cardinality: Cardinality }
    : never;

export type LinkTarget<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
    Link extends LinkName<Ontology, TypeName>,
> = LinkDefinition<Ontology, TypeName, Link>["target"];

export type SelectionPiece<Data extends Record<string, unknown>> =
    | {
          kind: "fields";
          fields: string[];
          readonly __data?: Data;
      }
    | {
          kind: "related";
          link: string;
          selection: SelectionNode;
          readonly __data?: Data;
      };

export type SelectionBuildResult =
    | SelectionPiece<Record<string, unknown>>
    | ReadonlyArray<SelectionPiece<Record<string, unknown>>>;

type PieceData<Piece> = Piece extends SelectionPiece<infer Data> ? Data : never;
type UnionToIntersection<Union> = (
    Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
    ? Intersection
    : never;
export type SelectionData<Result extends SelectionBuildResult> = Result extends ReadonlyArray<
    infer Piece
>
    ? UnionToIntersection<PieceData<Piece>>
    : PieceData<Result>;

type RelatedData<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
    Link extends LinkName<Ontology, TypeName>,
    ChildData extends Record<string, unknown>,
> = LinkDefinition<Ontology, TypeName, Link>["cardinality"] extends "many"
    ? { [Key in Link]: ChildData[] }
    : { [Key in Link]: ChildData | null };

export type SelectionBuilder<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
> = {
    fields: <
        const Names extends ReadonlyArray<ObjectFieldName<Ontology, TypeName>>,
    >(
        ...names: Names
    ) => SelectionPiece<Pick<Ontology["objectTypes"][TypeName], Names[number]>>;
    related: <
        Link extends LinkName<Ontology, TypeName>,
        Result extends SelectionBuildResult,
    >(
        link: Link,
        build: (
            selection: SelectionBuilder<Ontology, LinkTarget<Ontology, TypeName, Link>>
        ) => Result
    ) => SelectionPiece<
        RelatedData<Ontology, TypeName, Link, SelectionData<Result>>
    >;
};

function createBuilder<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
>(): SelectionBuilder<Ontology, TypeName> {
    return {
        fields: (...names) => ({
            kind: "fields",
            fields: [...names],
        }),
        related: (link, build) => ({
            kind: "related",
            link,
            selection: normalizeSelection(
                build(
                    createBuilder<
                        Ontology,
                        LinkTarget<Ontology, TypeName, typeof link>
                    >()
                )
            ),
        }),
    } as SelectionBuilder<Ontology, TypeName>;
}

function normalizeSelection<Result extends SelectionBuildResult>(
    result: Result
): SelectionNode<SelectionData<Result>> {
    const pieces: ReadonlyArray<SelectionPiece<Record<string, unknown>>> =
        Array.isArray(result)
            ? (result as ReadonlyArray<SelectionPiece<Record<string, unknown>>>)
            : [result as SelectionPiece<Record<string, unknown>>];
    const fields = new Set<string>();
    const relations: Record<string, SelectionNode> = {};
    for (const piece of pieces) {
        if (piece.kind === "fields") {
            for (const field of piece.fields) fields.add(field);
        } else {
            relations[piece.link] = relations[piece.link]
                ? mergeSelectionNodes(relations[piece.link]!, piece.selection)
                : piece.selection;
        }
    }
    return {
        fields: [...fields],
        relations,
    } as SelectionNode<SelectionData<Result>>;
}

/**
 * Create ontology-bound selection helpers. Both field names and relation names
 * (including nested relation targets/cardinality) come from generated ontology
 * types.
 */
export function createSelectionFactory<Ontology extends OntologyQueryDefinition>() {
    return function select<
        TypeName extends ObjectTypeName<Ontology>,
        Result extends SelectionBuildResult,
    >(
        _type: TypeName,
        build: (selection: SelectionBuilder<Ontology, TypeName>) => Result
    ): SelectionNode<SelectionData<Result>> {
        return normalizeSelection(build(createBuilder<Ontology, TypeName>()));
    };
}

export function mergeSelectionNodes(...selections: SelectionNode[]): SelectionNode {
    const fields = new Set<string>();
    const relations: Record<string, SelectionNode> = {};
    for (const selection of selections) {
        for (const field of selection.fields) fields.add(field);
        for (const [link, child] of Object.entries(selection.relations)) {
            relations[link] = relations[link]
                ? mergeSelectionNodes(relations[link], child)
                : child;
        }
    }
    return { fields: [...fields], relations };
}

export type CompiledJoin = {
    /** Alias used in the TanStack query (usually the link name, uniquified). */
    alias: string;
    objectType: string;
    linkName: string;
    fromAlias: string;
    fromKey: string;
    toKey: string;
    toPrimaryKey: string;
    cardinality: "one" | "many";
};

export type CompiledIncludeQuery = {
    rootAlias: string;
    rootObjectType: string;
    /** Flat property paths requested on each joined alias. */
    fieldsByAlias: Record<string, string[]>;
    joins: CompiledJoin[];
    /** Original selection tree (for nesting results / fragments). */
    select: SelectionNode;
};

function ensureField(fieldsByAlias: Record<string, string[]>, alias: string, field: string): void {
    fieldsByAlias[alias] ??= [];
    if (!fieldsByAlias[alias].includes(field)) {
        fieldsByAlias[alias].push(field);
    }
}

/**
 * Walk a selection tree and produce join + field plans using IR metadata.
 * Does not execute a query — pair with {@link applyIncludeQuery}.
 */
export function compileIncludeQuery(ir: OntologyIR, spec: IncludeQuerySpec): CompiledIncludeQuery {
    const rootAlias = spec.from;
    const fieldsByAlias: Record<string, string[]> = { [rootAlias]: [] };
    const joins: CompiledJoin[] = [];
    const usedAliases = new Set<string>([rootAlias]);

    function uniquify(base: string): string {
        if (!usedAliases.has(base)) {
            usedAliases.add(base);
            return base;
        }
        let index = 2;
        while (usedAliases.has(`${base}_${index}`)) {
            index += 1;
        }
        const alias = `${base}_${index}`;
        usedAliases.add(alias);
        return alias;
    }

    function walk(objectType: string, alias: string, selection: SelectionNode): void {
        const objectDef = ir.objectTypes.find((entry) => entry.name === objectType);
        if (!objectDef) {
            throw new Error(`Unknown object type "${objectType}".`);
        }
        const propertyNames = new Set(objectDef.properties.map((property) => property.name));

        for (const field of selection.fields) {
            if (!propertyNames.has(field)) {
                throw new Error(`Unknown property "${field}" on "${objectType}".`);
            }
            ensureField(fieldsByAlias, alias, field);
        }

        for (const [field, value] of Object.entries(selection.relations)) {
            const link = resolveLink(ir, objectType, field);
            const joinAlias = uniquify(field);
            fieldsByAlias[joinAlias] ??= [];
            // Always select join keys so nesting / grouping can reconstruct edges.
            ensureField(fieldsByAlias, alias, link.fromKey);
            ensureField(fieldsByAlias, joinAlias, link.toKey);
            ensureField(fieldsByAlias, joinAlias, link.toPrimaryKey);

            joins.push({
                alias: joinAlias,
                objectType: link.toObjectType,
                linkName: field,
                fromAlias: alias,
                fromKey: link.fromKey,
                toKey: link.toKey,
                toPrimaryKey: link.toPrimaryKey,
                cardinality: link.cardinality,
            });

            walk(link.toObjectType, joinAlias, value);
        }
    }

    walk(spec.from, rootAlias, spec.select);

    const rootPk = ir.objectTypes.find((entry) => entry.name === spec.from)?.primaryKey;
    if (rootPk) {
        ensureField(fieldsByAlias, rootAlias, rootPk);
    }

    return {
        rootAlias,
        rootObjectType: spec.from,
        fieldsByAlias,
        joins,
        select: spec.select,
    };
}
