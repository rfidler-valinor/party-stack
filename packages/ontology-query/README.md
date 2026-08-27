# `@party-stack/ontology-query`

Prototype APIs for **typed link following** and **Relay-style fragments** on top
of live ontology collections (TanStack DB).

Design rule: ontology helpers add relationship knowledge to normal TanStack
queries. They do not replace TanStack's query language or runtime.

## Related data in a normal TanStack query

Generated ontology types constrain the object/link names and target collection.
Runtime ontology IR supplies the foreign-key predicate:

```ts
import { createOntologyRelations } from "@party-stack/ontology-query";

const { related } = createOntologyRelations(ontology);
const project = related("Issue", "project");

useLiveQuery((q) =>
  q.from({ Issue: ontology.objects.Issue })
    .leftJoin(
      { project: project.collection },
      project.on("Issue", "project"),
    )
    .where(({ Issue }) => eq(Issue.issueStatus, "Open"))
    .orderBy(({ Issue }) => Issue.issueUpdatedAt, "desc")
    .select(({ Issue, project }) => ({
      issueId: Issue.issueId,
      projectTitle: project?.projectTitle,
    }))
);
```

The result is still a normal `QueryBuilder`, so joins, filters, aggregations,
grouping, having, ordering, pagination, subqueries, and arbitrary projections
remain available.

To-many nested data uses TanStack's correlated includes:

```ts
const issues = related("Project", "issues");

q.from({ Project: ontology.objects.Project }).select(({ Project }) => ({
  projectId: Project.projectId,
  issues: issues.toArray(q, Project, (child) =>
    child
      .where(({ related }) => eq(related.issueStatus, "Open"))
      .orderBy(({ related }) => related.issueUpdatedAt, "desc")
      .select(({ related }) => ({
        issueId: related.issueId,
        issueTitle: related.issueTitle,
      })),
  ),
}));
```

This produces native TanStack `IncludesSubquery` IR. `one(...)` materializes the
singleton form.

## Typed fragments (without `{ field: true }`)

```tsx
import { createFragmentFactory } from "@party-stack/ontology-query";
import { useFragment, useStitchedQuery } from "@party-stack/ontology-query/react";
import type { IssueTrackerOntology } from "./ontology/generated/types";

const fragment = createFragmentFactory<IssueTrackerOntology>();
const KanbanCardFragment = fragment(
  "KanbanCard",
  "Issue",
  ({ fields, related }) => [
    fields("issueId", "issueTitle"),
    related("project", ({ fields }) =>
      fields("projectTitle", "projectColor"),
    ),
  ],
);

function Board({ ontology }) {
  const { data } = useStitchedQuery(ontology, "Issue", [KanbanCardFragment]);
  return data.map((issue) => <KanbanCard issue={issue} />);
}

function KanbanCard({ issue }) {
  const data = useFragment(KanbanCardFragment, issue);
  return <h3>{data?.issueTitle}</h3>;
}
```

The generated ontology owns field/link/target/cardinality typing. Invalid fields
or links fail at compile time, and fragment result types preserve ontology
property types.

## Fluent compiler experiment

The earlier `.from().select()` spike is not the proposed final surface. The
complete design—including multiple relations, filters, aggregations,
`groupBy`/`having`, ordering, pagination, subqueries, and compilation to normal
TanStack query IR—is in
`specs/2026-08-15-ontology-query/README.md`.
