import {
    createSelectionFactory,
    type ObjectTypeName,
    type OntologyQueryDefinition,
    type SelectionBuildResult,
    type SelectionBuilder,
    type SelectionData,
    type SelectionNode,
} from "../query/selection.js";

/**
 * A Relay-inspired fragment: a named selection over an ontology object type.
 * Components declare these; pages stitch them into one include query.
 */
export type OntologyFragment<
    Ontology extends OntologyQueryDefinition = OntologyQueryDefinition,
    TypeName extends string = string,
    Data extends Record<string, unknown> = Record<string, unknown>,
> = {
    readonly $$typeof: "OntologyFragment";
    readonly name: string;
    readonly type: TypeName;
    readonly selection: SelectionNode<Data>;
    /** Type-only ontology identity; prevents cross-ontology fragment stitching. */
    readonly __ontology?: Ontology;
};

export type FragmentRef<F> = F extends OntologyFragment<
    OntologyQueryDefinition,
    string,
    infer Data
>
    ? Data
    : never;

/**
 * Create an ontology-bound fragment factory. This makes invalid fields, links,
 * nested target fields, and cross-ontology fragment use compile-time errors.
 *
 * @example
 * const fragment = createFragmentFactory<IssueTrackerOntology>();
 * const KanbanCardFragment = fragment("KanbanCard", "Issue", ({ fields, related }) => [
 *   fields("issueId", "issueTitle"),
 *   related("project", ({ fields }) => fields("projectTitle", "projectColor")),
 * ]);
 */
export function createFragmentFactory<Ontology extends OntologyQueryDefinition>() {
    const select = createSelectionFactory<Ontology>();
    return function fragment<
        TypeName extends ObjectTypeName<Ontology>,
        Result extends SelectionBuildResult,
    >(
        name: string,
        type: TypeName,
        build: (selection: SelectionBuilder<Ontology, TypeName>) => Result
    ): OntologyFragment<Ontology, TypeName, SelectionData<Result>> {
        return {
            $$typeof: "OntologyFragment",
            name,
            type,
            selection: select(type, build),
        };
    };
}

/** Type-only helper mirroring Relay's `FragmentRefs` masking (passthrough here). */
export type FragmentRefs<_FragmentNames extends string> = {
    readonly " $fragmentSpreads": _FragmentNames;
};
