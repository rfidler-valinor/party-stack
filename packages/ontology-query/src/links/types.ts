import type { LinkCardinality } from "@party-stack/ontology";

/**
 * A navigable edge derived from ontology IR link metadata.
 *
 * Each IR `linkType` yields two directions:
 * - source → target via `target.name` (e.g. Project.issues)
 * - target → source via `source.name` (e.g. Issue.project)
 */
export type ResolvedLink = {
    /** Link field name on `fromObjectType`. */
    linkName: string;
    fromObjectType: string;
    toObjectType: string;
    /** Cardinality of this navigation direction. */
    cardinality: LinkCardinality;
    /** Property that stores the foreign key. */
    foreignKey: string;
    /** Object type that owns `foreignKey`. */
    foreignKeyObjectType: string;
    /** Join key on the `from` side. */
    fromKey: string;
    /** Join key on the `to` side. */
    toKey: string;
    /** Primary key of `fromObjectType`. */
    fromPrimaryKey: string;
    /** Primary key of `toObjectType`. */
    toPrimaryKey: string;
    /** IR link type id. */
    linkTypeId: string;
};
