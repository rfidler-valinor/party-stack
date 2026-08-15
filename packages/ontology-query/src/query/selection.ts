import type { OntologyIR } from "@party-stack/ontology";
import { resolveLink } from "../links/resolveLink.js";

/**
 * Declarative selection / include trees over the ontology graph.
 *
 * Property fields are requested with `true`. Link fields nest another
 * selection. This is the shared IR for both the include query compiler and
 * Relay-style fragments.
 */
export type SelectionNode = {
    [field: string]: true | SelectionNode;
};

export type IncludeQuerySpec = {
    /** Root object type to query from. */
    from: string;
    /** Nested property + link selection. */
    select: SelectionNode;
};

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

function isLinkSelection(value: true | SelectionNode): value is SelectionNode {
    return value !== true;
}

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

        for (const [field, value] of Object.entries(selection)) {
            if (!isLinkSelection(value)) {
                if (!propertyNames.has(field)) {
                    throw new Error(`Unknown property "${field}" on "${objectType}".`);
                }
                ensureField(fieldsByAlias, alias, field);
                continue;
            }

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
