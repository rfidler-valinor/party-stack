"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import {
    createOntologyRelations,
    ontologyQuery,
    resolveLink,
} from "@party-stack/ontology-query";
import { useFragment, useStitchedQuery } from "@party-stack/ontology-query/react";
import { useCallback, useMemo, useState } from "react";
import {
    getIssueTrackerCollections,
    type BackendKind,
} from "../app/collections";
import {
    KanbanCardFragment,
    IssueBoardFragments,
} from "./fragments";

/**
 * Interactive lab that demos the three include/query styles and Relay-style
 * fragment stitching against the live issue-tracker ontology.
 */
export function QueryLab() {
    const collections = getIssueTrackerCollections();
    const [backendKind, setBackendKind] = useState<BackendKind>("sqlite");
    const ontology = collections[backendKind];
    const relations = useMemo(
        () => createOntologyRelations(ontology),
        [ontology]
    );
    const issueProject = useMemo(
        () => relations.related("Issue", "project"),
        [relations]
    );
    const projectIssues = useMemo(
        () => relations.related("Project", "issues"),
        [relations]
    );

    const resolved = useMemo(() => {
        try {
            return {
                issueProject: resolveLink(ontology.ir, "Issue", "project"),
                projectIssues: resolveLink(ontology.ir, "Project", "issues"),
            };
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }, [ontology]);

    // Idea A — relation descriptor inside an otherwise-normal TanStack query.
    const ideaA = useLiveQuery(
        (q) =>
            q
                .from({ Issue: ontology.objects.Issue })
                .leftJoin(
                    { project: issueProject.collection },
                    issueProject.on("Issue", "project")
                )
                .where(({ Issue }) => eq(Issue.issueStatus, "Open"))
                .orderBy(({ Issue }) => Issue.issueUpdatedAt, "desc")
                .select(({ Issue, project }) => ({
                    issueId: Issue.issueId,
                    issueTitle: Issue.issueTitle,
                    projectTitle: project?.projectTitle,
                    projectColor: project?.projectColor,
                })),
        [ontology, issueProject]
    );

    // Idea B — fluent ontologyQuery builder
    const ideaBPlan = useMemo(
        () =>
            ontologyQuery(ontology)
                .from("Issue")
                .select(KanbanCardFragment.selection),
        [ontology]
    );
    const ideaBLive = useLiveQuery(
        (q) => ideaBPlan.buildLive(q),
        [ideaBPlan]
    );
    const ideaB = useMemo(
        () => ideaBPlan.nest((ideaBLive.data ?? []) as Array<Record<string, unknown>>),
        [ideaBPlan, ideaBLive.data]
    );

    // Idea C — correlated MANY include compiled to TanStack IncludesSubquery.
    const { data: ideaC } = useLiveQuery(
        (q) =>
            q
                .from({ Project: ontology.objects.Project })
                .orderBy(({ Project }) => Project.projectTitle)
                .select(({ Project }) => ({
                    projectId: Project.projectId,
                    projectTitle: Project.projectTitle,
                    projectColor: Project.projectColor,
                    issues: projectIssues.toArray(q, Project, (child) =>
                        child
                            .orderBy(({ related }) => related.issueTitle)
                            .select(({ related }) => ({
                                issueId: related.issueId,
                                issueTitle: related.issueTitle,
                                issueStatus: related.issueStatus,
                            }))
                    ),
                })),
        [ontology, projectIssues]
    );

    // Fragments — page stitches KanbanCardFragment; child uses useFragment
    const refineOpenIssues = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (q: any) =>
            q.where(({ Issue }: { Issue: { issueStatus: string } }) =>
                eq(Issue.issueStatus, "Open")
            ),
        []
    );
    const stitched = useStitchedQuery(ontology, "Issue", IssueBoardFragments, {
        refine: refineOpenIssues,
        deps: [ontology],
    });

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <header className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                            ontology-query prototype
                        </p>
                        <h1 className="text-xl font-semibold text-slate-950">
                            Query Lab
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Typed link includes + Relay-style fragments over the
                            issue-tracker ontology.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                            href="/"
                        >
                            ← Board
                        </a>
                        <select
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm"
                            onChange={(event) =>
                                setBackendKind(event.target.value as BackendKind)
                            }
                            value={backendKind}
                        >
                            <option value="sqlite">sqlite</option>
                            <option value="foundry">foundry</option>
                        </select>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8">
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">
                        IR link resolution
                    </h2>
                    <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                        {JSON.stringify(resolved, null, 2)}
                    </pre>
                </section>

                <DemoSection
                    code={`q.from({ Issue }).leftJoin({ project: related("Issue", "project").collection }, relation.on("Issue", "project")).where(…).orderBy(…).select(…)`}
                    rows={(ideaA.data ?? []).slice(0, 5)}
                    title="Idea A — related descriptor in a normal TanStack query"
                />

                <DemoSection
                    code={`ontologyQuery(ontology).from("Issue").select(KanbanCardFragment.selection)`}
                    rows={ideaB.slice(0, 5)}
                    title="Idea B — compiler spike (full design in spec)"
                />

                <DemoSection
                    code={`projectIssues.toArray(q, Project, child => child.where(…).orderBy(…).select(…))`}
                    rows={(ideaC ?? []).slice(0, 5)}
                    title="Idea C — native correlated Project.issues include"
                />

                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Fragments — stitched Open issues
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Page runs <code>useStitchedQuery</code> over{" "}
                        <code>KanbanCardFragment</code>; each card calls{" "}
                        <code>useFragment</code> (data masking).
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-slate-400">
                        stitched fields:{" "}
                        {Object.keys(stitched.stitched.select).join(", ")}
                    </p>
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                        {stitched.data.slice(0, 8).map((issue) => (
                            <FragmentCard
                                issue={issue}
                                key={String(issue.issueId)}
                            />
                        ))}
                        {stitched.data.length === 0 && (
                            <li className="text-sm text-slate-400">
                                No Open issues loaded yet.
                            </li>
                        )}
                    </ul>
                </section>
            </main>
        </div>
    );
}

function DemoSection({
    title,
    code,
    rows,
}: {
    title: string;
    code: string;
    rows: unknown[];
}) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <code className="mt-2 block overflow-x-auto rounded-md bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
                {code}
            </code>
            <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                {JSON.stringify(rows, null, 2)}
            </pre>
        </section>
    );
}

function FragmentCard({ issue }: { issue: Record<string, unknown> }) {
    const data = useFragment(KanbanCardFragment, issue);
    if (!data) {
        return null;
    }
    const project = data.project as
        | { projectTitle?: string; projectColor?: string }
        | null
        | undefined;
    return (
        <li className="rounded-lg border border-slate-200 px-3 py-2">
            <p className="text-sm font-medium text-slate-800">
                {String(data.issueTitle)}
            </p>
            {project?.projectTitle && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span
                        className="size-1.5 rounded-sm"
                        style={{
                            backgroundColor: project.projectColor || "#94a3b8",
                        }}
                    />
                    {project.projectTitle}
                </p>
            )}
        </li>
    );
}
