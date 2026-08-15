import type { SelectionNode } from "../query/selection.js";

/**
 * A Relay-inspired fragment: a named selection over an ontology object type.
 * Components declare these; pages stitch them into one include query.
 */
export type OntologyFragment<
    TypeName extends string = string,
    Selection extends SelectionNode = SelectionNode,
> = {
    readonly $$typeof: "OntologyFragment";
    readonly name: string;
    readonly type: TypeName;
    readonly selection: Selection;
};

export type FragmentRef<F> =
    F extends OntologyFragment<string, infer Selection> ? InferSelection<Selection> : never;

/**
 * Infer the nested data shape from a selection node.
 * Link fields become nested objects (or arrays when callers mark them as many
 * via runtime nesting — typing defaults to object | null for prototype simplicity).
 */
export type InferSelection<Selection extends SelectionNode> = {
    [K in keyof Selection]: Selection[K] extends SelectionNode
        ? InferSelection<Selection[K]> | null | Array<InferSelection<Selection[K]>>
        : unknown;
};

/**
 * Declare a fragment over an ontology object type.
 *
 * @example
 * const KanbanCardFragment = fragment("KanbanCard", "Issue", {
 *   issueId: true,
 *   issueTitle: true,
 *   project: { projectTitle: true, projectColor: true },
 * });
 */
export function fragment<TypeName extends string, Selection extends SelectionNode>(
    name: string,
    type: TypeName,
    selection: Selection
): OntologyFragment<TypeName, Selection> {
    return {
        $$typeof: "OntologyFragment",
        name,
        type,
        selection,
    };
}

/** Type-only helper mirroring Relay's `FragmentRefs` masking (passthrough here). */
export type FragmentRefs<_FragmentNames extends string> = {
    readonly " $fragmentSpreads": _FragmentNames;
};
