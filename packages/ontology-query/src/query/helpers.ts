import { eq, type InitialQueryBuilder } from "@tanstack/db";
import { resolveLink } from "../links/resolveLink.js";
import type { AnyLiveOntology } from "../ontologyTypes.js";

type JoinTables = Record<string, Record<string, unknown> | undefined>;

/**
 * Idea A — small helpers that decorate an existing TanStack query with
 * IR-aware link joins, without adopting the full include builder.
 *
 * @example
 * useLiveQuery((q) => {
 *   const base = fromObject(q, ontology, "Issue");
 *   return leftJoinLink(base, ontology, "Issue", "project").select(...)
 * })
 */
export function leftJoinLink(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack QueryBuilder is highly generic
    query: any,
    ontology: AnyLiveOntology,
    fromObjectType: string,
    linkName: string,
    opts?: { alias?: string; fromAlias?: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
    const link = resolveLink(ontology.ir, fromObjectType, linkName);
    const alias = opts?.alias ?? linkName;
    const fromAlias = opts?.fromAlias ?? fromObjectType;
    const collection = ontology.objects[link.toObjectType];
    if (!collection) {
        throw new Error(`Ontology has no collection for "${link.toObjectType}".`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return query.leftJoin({ [alias]: collection }, (tables: JoinTables) => {
        const fromTable = tables[fromAlias];
        const toTable = tables[alias];
        return eq(fromTable?.[link.fromKey] as never, toTable?.[link.toKey] as never);
    });
}

/**
 * Start a TanStack query from an ontology object collection by type name.
 */
export function fromObject(
    q: InitialQueryBuilder,
    ontology: AnyLiveOntology,
    objectType: string
) {
    const collection = ontology.objects[objectType];
    if (!collection) {
        throw new Error(`Ontology has no collection for "${objectType}".`);
    }
    return q.from({ [objectType]: collection });
}
