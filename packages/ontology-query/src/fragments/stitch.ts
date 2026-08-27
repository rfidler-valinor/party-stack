import {
    mergeSelectionNodes,
    type OntologyQueryDefinition,
    type SelectionNode,
} from "../query/selection.js";
import type { OntologyFragment } from "./fragment.js";

/**
 * Deep-merge selection trees. Later spreads win on conflicting property leaves;
 * nested link selections are merged recursively.
 */
export function mergeSelections(...selections: SelectionNode[]): SelectionNode {
    return mergeSelectionNodes(...selections);
}

/**
 * Stitch fragments (and optional extra fields) that share a root object type
 * into a single selection — the page-level "parent query" in Relay terms.
 */
export function stitchFragments<
    Ontology extends OntologyQueryDefinition,
    TypeName extends string,
>(
    type: TypeName,
    fragments: ReadonlyArray<
        OntologyFragment<Ontology, TypeName, Record<string, unknown>>
    >,
    extra?: SelectionNode
): { type: TypeName; select: SelectionNode; fragmentNames: string[] } {
    for (const entry of fragments) {
        if (entry.type !== type) {
            throw new Error(
                `Cannot stitch fragment "${entry.name}" of type "${entry.type}" into a "${type}" query.`
            );
        }
    }
    const select = mergeSelections(
        ...fragments.map((entry) => entry.selection),
        extra ?? { fields: [], relations: {} }
    );
    return {
        type,
        select,
        fragmentNames: fragments.map((entry) => entry.name),
    };
}

/**
 * Mask parent query data down to a fragment's selection (Relay-style data masking).
 * Unknown link/property keys are dropped so components only see their contract.
 */
export function readFragmentData<
    Ontology extends OntologyQueryDefinition,
    Data extends Record<string, unknown>,
>(
    fragmentDef: OntologyFragment<Ontology, string, Data>,
    data: Record<string, unknown> | null | undefined
): Data | null {
    if (data == null) {
        return null;
    }
    return maskSelection(fragmentDef.selection, data) as Data;
}

function maskSelection(
    selection: SelectionNode,
    data: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const field of selection.fields) {
        if (field in data) result[field] = data[field];
    }
    for (const [key, value] of Object.entries(selection.relations)) {
        const nested = data[key];
        if (Array.isArray(nested)) {
            result[key] = nested.map((item): unknown =>
                item && typeof item === "object"
                    ? maskSelection(value, item as Record<string, unknown>)
                    : item
            );
        } else if (nested && typeof nested === "object") {
            result[key] = maskSelection(value, nested as Record<string, unknown>);
        } else {
            result[key] = nested ?? null;
        }
    }
    return result;
}
