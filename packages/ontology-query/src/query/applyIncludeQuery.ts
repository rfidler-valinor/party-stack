import { eq, type InitialQueryBuilder } from "@tanstack/db";
import type { AnyLiveOntology } from "../ontologyTypes.js";
import type { CompiledIncludeQuery, SelectionNode } from "./selection.js";

type QueryTables = Record<string, Record<string, unknown> | undefined>;

function columnKey(rootAlias: string, alias: string, field: string): string {
    return alias === rootAlias ? field : `${alias}__${field}`;
}

export type ApplyIncludeQueryOptions = {
    /**
     * Refine the query after joins are applied but before the flat select
     * (where / orderBy / limit live here).
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack builder chain is opaque across joins
    refine?: (query: any) => any;
};

/**
 * Apply a compiled include plan onto a TanStack DB query builder.
 *
 * Joins follow IR link foreign keys. The select clause returns a *flat* row
 * (root fields + `linkName__field` columns) which {@link nestIncludeRows} turns
 * back into the nested selection shape.
 */
export function applyIncludeQuery(
    q: InitialQueryBuilder,
    ontology: AnyLiveOntology,
    compiled: CompiledIncludeQuery,
    options: ApplyIncludeQueryOptions = {}
) {
    const rootCollection = ontology.objects[compiled.rootObjectType];
    if (!rootCollection) {
        throw new Error(`Ontology has no collection for "${compiled.rootObjectType}".`);
    }

    let query = q.from({ [compiled.rootAlias]: rootCollection });

    for (const join of compiled.joins) {
        const collection = ontology.objects[join.objectType];
        if (!collection) {
            throw new Error(`Ontology has no collection for "${join.objectType}".`);
        }
        const fromAlias = join.fromAlias;
        const toAlias = join.alias;
        const fromKey = join.fromKey;
        const toKey = join.toKey;
        query = query.leftJoin({ [toAlias]: collection }, (tables: QueryTables) => {
            const fromTable = tables[fromAlias];
            const toTable = tables[toAlias];
            return eq(
                // TanStack refs are opaque; cast keeps the helper usable without
                // generating per-ontology query types in this prototype.
                fromTable?.[fromKey] as never,
                toTable?.[toKey] as never
            );
        });
    }

    if (options.refine) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- opaque TanStack builder
        query = options.refine(query);
    }

    return query.select((tables: QueryTables) => {
        const row: Record<string, unknown> = {};
        for (const [alias, fields] of Object.entries(compiled.fieldsByAlias)) {
            const table = tables[alias];
            for (const field of fields) {
                row[columnKey(compiled.rootAlias, alias, field)] = table?.[field];
            }
        }
        return row;
    });
}

/**
 * Convert flat joined rows into the nested include selection shape.
 * MANY-cardinality links are grouped into arrays keyed by parent primary key.
 */
export function nestIncludeRows(
    compiled: CompiledIncludeQuery,
    flatRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
    if (flatRows.length === 0) {
        return [];
    }

    const rootPk =
        Object.keys(flatRows[0]!).find((key) => !key.includes("__") && /id$/i.test(key)) ??
        compiled.fieldsByAlias[compiled.rootAlias]?.[0];

    const hasMany = compiled.joins.some((join) => join.cardinality === "many");
    if (!hasMany) {
        return flatRows.map((row) => projectSelection(compiled, row, compiled.select, compiled.rootAlias));
    }

    const groups = new Map<string, Array<Record<string, unknown>>>();
    for (const row of flatRows) {
        const key = String(rootPk ? row[rootPk] : JSON.stringify(row));
        const list = groups.get(key) ?? [];
        list.push(row);
        groups.set(key, list);
    }

    return [...groups.values()].map((group) =>
        projectSelectionGroup(compiled, group, compiled.select, compiled.rootAlias)
    );
}

function readField(
    compiled: CompiledIncludeQuery,
    row: Record<string, unknown>,
    alias: string,
    field: string
): unknown {
    return row[columnKey(compiled.rootAlias, alias, field)];
}

function projectSelection(
    compiled: CompiledIncludeQuery,
    row: Record<string, unknown>,
    selection: SelectionNode,
    alias: string
): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(selection)) {
        if (value === true) {
            result[field] = readField(compiled, row, alias, field);
            continue;
        }

        const join = compiled.joins.find(
            (entry) => entry.fromAlias === alias && entry.linkName === field
        );
        if (!join) {
            continue;
        }

        const nested = projectSelection(compiled, row, value, join.alias);
        const empty = isJoinedRowEmpty(compiled, row, join.alias);

        if (join.cardinality === "many") {
            result[field] = empty ? [] : [nested];
        } else {
            result[field] = empty ? null : nested;
        }
    }

    return result;
}

function projectSelectionGroup(
    compiled: CompiledIncludeQuery,
    rows: Array<Record<string, unknown>>,
    selection: SelectionNode,
    alias: string
): Record<string, unknown> {
    const first = rows[0]!;
    const result: Record<string, unknown> = {};

    for (const [field, value] of Object.entries(selection)) {
        if (value === true) {
            result[field] = readField(compiled, first, alias, field);
            continue;
        }

        const join = compiled.joins.find(
            (entry) => entry.fromAlias === alias && entry.linkName === field
        );
        if (!join) {
            continue;
        }

        if (join.cardinality === "many") {
            const children: Array<Record<string, unknown>> = [];
            const seen = new Set<string>();
            for (const row of rows) {
                if (isJoinedRowEmpty(compiled, row, join.alias)) {
                    continue;
                }
                const id = String(readField(compiled, row, join.alias, join.toPrimaryKey));
                if (seen.has(id)) {
                    continue;
                }
                seen.add(id);
                children.push(projectSelectionGroup(compiled, [row], value, join.alias));
            }
            result[field] = children;
        } else if (isJoinedRowEmpty(compiled, first, join.alias)) {
            result[field] = null;
        } else {
            result[field] = projectSelectionGroup(compiled, [first], value, join.alias);
        }
    }

    return result;
}

function isJoinedRowEmpty(
    compiled: CompiledIncludeQuery,
    row: Record<string, unknown>,
    alias: string
): boolean {
    const fields = compiled.fieldsByAlias[alias] ?? [];
    return fields.every((field) => readField(compiled, row, alias, field) == null);
}
