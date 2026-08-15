import { eq, type InitialQueryBuilder } from "@tanstack/db";
import type { LiveOntology } from "@party-stack/ontology";
import { resolveLink } from "../links/resolveLink.js";

/**
 * Idea A — small helpers that decorate an existing TanStack query with
 * IR-aware link joins, without adopting the full include builder.
 *
 * @example
 * useLiveQuery((q) => {
 *   const base = q.from({ Issue: ontology.objects.Issue });
 *   return leftJoinLink(base, ontology, "Issue", "project").select(...)
 * })
 */
export function leftJoinLink(
    query: {
        leftJoin: (
            collectionRef: Record<string, unknown>,
            on: (tables: Record<string, Record<string, unknown> | undefined>) => unknown
        ) => unknown;
    },
    ontology: LiveOntology,
    fromObjectType: string,
    linkName: string,
    opts?: { alias?: string; fromAlias?: string }
) {
    const link = resolveLink(ontology.ir, fromObjectType, linkName);
    const alias = opts?.alias ?? linkName;
    const fromAlias = opts?.fromAlias ?? fromObjectType;
    const collection = ontology.objects[link.toObjectType];
    if (!collection) {
        throw new Error(`Ontology has no collection for "${link.toObjectType}".`);
    }

    return query.leftJoin({ [alias]: collection }, (tables) => {
        const fromTable = tables[fromAlias];
        const toTable = tables[alias];
        return eq(fromTable?.[link.fromKey] as never, toTable?.[link.toKey] as never);
    });
}

/**
 * Start a TanStack query from an ontology object collection by type name.
 */
export function fromObject(q: InitialQueryBuilder, ontology: LiveOntology, objectType: string) {
    const collection = ontology.objects[objectType];
    if (!collection) {
        throw new Error(`Ontology has no collection for "${objectType}".`);
    }
    return q.from({ [objectType]: collection });
}
