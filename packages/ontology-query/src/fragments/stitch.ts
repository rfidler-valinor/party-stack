import type { OntologyFragment } from "./fragment.js";
import type { SelectionNode } from "../query/selection.js";

function isSelectionNode(value: true | SelectionNode): value is SelectionNode {
    return value !== true;
}

/**
 * Deep-merge selection trees. Later spreads win on conflicting property leaves;
 * nested link selections are merged recursively.
 */
export function mergeSelections(...selections: SelectionNode[]): SelectionNode {
    const result: SelectionNode = {};
    for (const selection of selections) {
        for (const [key, value] of Object.entries(selection)) {
            const existing = result[key];
            if (existing === undefined) {
                result[key] = value;
                continue;
            }
            if (isSelectionNode(existing) && isSelectionNode(value)) {
                result[key] = mergeSelections(existing, value);
                continue;
            }
            // Prefer the more specific nested selection over a bare `true`.
            if (isSelectionNode(value)) {
                result[key] = value;
            } else if (!isSelectionNode(existing)) {
                result[key] = value;
            }
        }
    }
    return result;
}

/**
 * Stitch fragments (and optional extra fields) that share a root object type
 * into a single selection — the page-level "parent query" in Relay terms.
 */
export function stitchFragments<TypeName extends string>(
    type: TypeName,
    fragments: ReadonlyArray<OntologyFragment<TypeName, SelectionNode>>,
    extra?: SelectionNode
): { type: TypeName; select: SelectionNode; fragmentNames: string[] } {
    for (const entry of fragments) {
        if (entry.type !== type) {
            throw new Error(
                `Cannot stitch fragment "${entry.name}" of type "${entry.type}" into a "${type}" query.`
            );
        }
    }
    const select = mergeSelections(...fragments.map((entry) => entry.selection), extra ?? {});
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
export function readFragmentData<Selection extends SelectionNode>(
    fragmentDef: OntologyFragment<string, Selection>,
    data: Record<string, unknown> | null | undefined
): InferMaskedData<Selection> | null {
    if (data == null) {
        return null;
    }
    return maskSelection(fragmentDef.selection, data) as InferMaskedData<Selection>;
}

type InferMaskedData<Selection extends SelectionNode> = {
    [K in keyof Selection]: Selection[K] extends SelectionNode
        ?
              | InferMaskedData<Selection[K]>
              | null
              | Array<InferMaskedData<Selection[K]>>
        : unknown;
};

function maskSelection(
    selection: SelectionNode,
    data: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(selection)) {
        if (value === true) {
            if (key in data) {
                result[key] = data[key];
            }
            continue;
        }
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
