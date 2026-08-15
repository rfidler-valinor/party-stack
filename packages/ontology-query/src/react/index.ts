import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import {
    fragment,
    readFragmentData,
    stitchFragments,
    type FragmentRef,
    type OntologyFragment,
} from "../fragments/index.js";
import {
    includeQuery,
    type ApplyIncludeQueryOptions,
    type SelectionNode,
} from "../query/index.js";
import type { AnyLiveOntology } from "../ontologyTypes.js";
import type { InitialQueryBuilder } from "@tanstack/db";

export { fragment, readFragmentData, stitchFragments };
export type { FragmentRef, OntologyFragment };

/**
 * Read a fragment from parent query data (Relay `useFragment` analogue).
 * Performs shallow data masking so the component only sees declared fields.
 */
export function useFragment<Selection extends SelectionNode>(
    fragmentDef: OntologyFragment<string, Selection>,
    fragmentRef: Record<string, unknown> | null | undefined
): ReturnType<typeof readFragmentData<Selection>> {
    return useMemo(
        () => readFragmentData(fragmentDef, fragmentRef),
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
export function useStitchedQuery<TypeName extends string>(
    ontology: AnyLiveOntology,
    type: TypeName,
    fragments: ReadonlyArray<OntologyFragment<TypeName, SelectionNode>>,
    options: UseStitchedQueryOptions = {}
): UseStitchedQueryResult {
    const stitched = useMemo(
        () => stitchFragments(type, fragments, options.extra),
        [type, fragments, options.extra]
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
    const live = useLiveQuery(
        (q: InitialQueryBuilder) => plan.buildLive(q, { refine }),
        [plan, refine, ...(options.deps ?? [])]
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
