import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import {
    createFragmentFactory,
    readFragmentData,
    stitchFragments,
    type FragmentRef,
    type OntologyFragment,
} from "../fragments/index.js";
import {
    includeQuery,
    type ApplyIncludeQueryOptions,
    type ObjectTypeName,
    type OntologyQueryDefinition,
    type SelectionNode,
} from "../query/index.js";
import type { AnyLiveOntology } from "../ontologyTypes.js";
import type { InitialQueryBuilder } from "@tanstack/db";

export { createFragmentFactory, readFragmentData, stitchFragments };
export type { FragmentRef, OntologyFragment };

/**
 * Read a fragment from parent query data (Relay `useFragment` analogue).
 * Performs shallow data masking so the component only sees declared fields.
 */
export function useFragment<Fragment extends OntologyFragment>(
    fragmentDef: Fragment,
    fragmentRef: Record<string, unknown> | null | undefined
): FragmentRef<Fragment> | null {
    return useMemo(
        () => readFragmentData(fragmentDef, fragmentRef) as FragmentRef<Fragment> | null,
        [fragmentDef, fragmentRef]
    );
}

export type UseStitchedQueryOptions = {
    /** Extra selection fields beyond stitched fragments. */
    extra?: SelectionNode;
    /**
     * Refine after joins / before select (where, orderBy, …).
     */
    refine?: ApplyIncludeQueryOptions["refine"];
    deps?: unknown[];
};

export type UseStitchedQueryResult = {
    data: Array<Record<string, unknown>>;
    stitched: ReturnType<typeof stitchFragments>;
    isLoading: boolean;
    isError: boolean;
    isReady: boolean;
    status: string;
};

/**
 * Page-level hook: stitch fragments into one include query, run it live, nest
 * rows into the GraphQL-like selection shape, and return fragment refs.
 */
export function useStitchedQuery<
    Ontology extends OntologyQueryDefinition,
    TypeName extends ObjectTypeName<Ontology>,
>(
    ontology: AnyLiveOntology,
    type: TypeName,
    fragments: ReadonlyArray<
        OntologyFragment<Ontology, TypeName, Record<string, unknown>>
    >,
    options: UseStitchedQueryOptions = {}
): UseStitchedQueryResult {
    const extra = options.extra;
    const stitched = useMemo(
        () => stitchFragments(type, fragments, extra),
        [type, fragments, extra]
    );

    const plan = useMemo(
        () =>
            includeQuery(ontology, {
                from: stitched.type,
                select: stitched.select,
            }),
        [ontology, stitched]
    );

    const refine = options.refine;
    const deps = options.deps ?? [];
    const live = useLiveQuery(
        (q: InitialQueryBuilder) => plan.buildLive(q, { refine }),
        // Intentionally omit `refine` identity — callers should pass stable
        // callbacks (useCallback) or put changing inputs in `deps`.
        [plan, ...deps]
    );

    const data = useMemo(() => {
        const rows = (live.data ?? []) as Array<Record<string, unknown>>;
        return plan.nest(rows);
    }, [live.data, plan]);

    return {
        data,
        stitched,
        isLoading: live.isLoading,
        isError: live.isError,
        isReady: live.isReady,
        status: live.status,
    };
}
