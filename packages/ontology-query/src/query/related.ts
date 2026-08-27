import {
    eq,
    materialize,
    toArray,
    type Context,
    type ContextFromSource,
    type GetResult,
    type InitialQueryBuilder,
    type QueryBuilder,
    type Source,
} from "@tanstack/db";
import type { LiveOntology, OntologyDefinition } from "@party-stack/ontology";
import { resolveLink } from "../links/resolveLink.js";
import type {
    LinkName,
    LinkTarget,
    ObjectTypeName,
    OntologyQueryDefinition,
} from "./selection.js";

type QueryOntology = OntologyDefinition & OntologyQueryDefinition;
type RelatedCollection<
    Ontology extends QueryOntology,
    TypeName extends ObjectTypeName<Ontology>,
    Link extends LinkName<Ontology, TypeName>,
> = LiveOntology<Ontology>["objects"][LinkTarget<Ontology, TypeName, Link>];

type SourceValue = Source[string];
type RelatedContext<Collection> = ContextFromSource<{
    related: Extract<Collection, SourceValue>;
}>;

type JoinRefs = Record<string, Record<string, unknown> | undefined>;
type RelatedArray<ResultContext extends Context> = ReturnType<typeof toArray> & {
    readonly _result: GetResult<ResultContext>;
};
type RelatedOne<ResultContext extends Context> = ReturnType<typeof materialize> & {
    readonly _result: GetResult<ResultContext>;
    readonly _isSingle: true;
};

export type RelatedDescriptor<
    Ontology extends QueryOntology,
    TypeName extends ObjectTypeName<Ontology>,
    Link extends LinkName<Ontology, TypeName>,
> = {
    readonly name: Link;
    readonly fromType: TypeName;
    readonly targetType: LinkTarget<Ontology, TypeName, Link>;
    readonly cardinality: Ontology["linkTypes"][TypeName][Link] extends {
        cardinality: infer Cardinality;
    }
        ? Cardinality
        : never;
    readonly collection: RelatedCollection<Ontology, TypeName, Link>;

    /**
     * Correlation predicate for a normal TanStack join.
     *
     * @example
     * const project = related("Issue", "project");
     * q.from({ Issue })
     *  .leftJoin({ project: project.collection }, project.on("Issue", "project"))
     *  .where(...)
     *  .groupBy(...)
     *  .select(...)
     */
    on(
        fromAlias: string,
        relatedAlias: string
    ): (tables: JoinRefs) => ReturnType<typeof eq>;

    /**
     * Correlated MANY include. `build` receives a normal TanStack QueryBuilder
     * with a typed `related` source, so all child filters, aggregates, ordering,
     * limits, and further includes remain available.
     */
    toArray<ResultContext extends Context>(
        q: InitialQueryBuilder,
        parent: Record<string, unknown>,
        build: (
            query: QueryBuilder<
                RelatedContext<RelatedCollection<Ontology, TypeName, Link>>
            >
        ) => QueryBuilder<ResultContext>
    ): RelatedArray<ResultContext>;

    /** Correlated ONE include materialized as a singleton. */
    one<ResultContext extends Context>(
        q: InitialQueryBuilder,
        parent: Record<string, unknown>,
        build: (
            query: QueryBuilder<
                RelatedContext<RelatedCollection<Ontology, TypeName, Link>>
            >
        ) => QueryBuilder<ResultContext>
    ): RelatedOne<ResultContext>;
};

/**
 * Bind ontology-aware relation descriptors to a generated live ontology.
 * The descriptor supplies collections/correlation only; the surrounding query
 * remains an ordinary TanStack DB query.
 */
export function createOntologyRelations<Ontology extends QueryOntology>(
    ontology: LiveOntology<Ontology>
) {
    return {
        related<
            TypeName extends ObjectTypeName<Ontology>,
            Link extends LinkName<Ontology, TypeName>,
        >(
            fromType: TypeName,
            linkName: Link
        ): RelatedDescriptor<Ontology, TypeName, Link> {
            const link = resolveLink(ontology.ir, fromType, linkName);
            const collection = ontology.objects[link.toObjectType] as unknown as RelatedCollection<
                Ontology,
                TypeName,
                Link
            >;

            function correlated(
                q: InitialQueryBuilder,
                parent: Record<string, unknown>
            ) {
                return q
                    .from({ related: collection })
                    .where(({ related }) =>
                        eq(
                            related[link.toKey as keyof typeof related] as never,
                            parent[link.fromKey] as never
                        )
                    );
            }

            return {
                name: linkName,
                fromType,
                targetType: link.toObjectType as LinkTarget<
                    Ontology,
                    TypeName,
                    Link
                >,
                cardinality: link.cardinality as RelatedDescriptor<
                    Ontology,
                    TypeName,
                    Link
                >["cardinality"],
                collection,
                on: (fromAlias, relatedAlias) => (tables) =>
                    eq(
                        tables[fromAlias]?.[link.fromKey] as never,
                        tables[relatedAlias]?.[link.toKey] as never
                    ),
                toArray: (q, parent, build) =>
                    toArray(build(correlated(q, parent) as never)) as never,
                one: (q, parent, build) =>
                    materialize(
                        build(correlated(q, parent) as never).findOne()
                    ) as never,
            };
        },
    };
}
