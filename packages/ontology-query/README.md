# `@party-stack/ontology-query`

Prototype APIs for **typed link following** and **Relay-style fragments** on top of
live ontology collections (TanStack DB).

This package explores a few shapes — keep what feels good, discard the rest.

## 1. Following links (joins / includes)

Ontology IR already describes links (`linkTypes`). Today apps hand-write
`leftJoin` on foreign keys. These helpers derive joins from IR instead.

### Idea A — helpers on TanStack queries

```ts
import { fromObject, leftJoinLink } from "@party-stack/ontology-query";

useLiveQuery((q) =>
  leftJoinLink(fromObject(q, ontology, "Issue"), ontology, "Issue", "project")
    .select(({ Issue, project }) => ({
      issueId: Issue.issueId,
      projectTitle: project.projectTitle,
    }))
);
```

### Idea B — fluent builder

```ts
import { ontologyQuery } from "@party-stack/ontology-query";

const q = ontologyQuery(ontology)
  .from("Issue")
  .select({
    issueId: true,
    issueTitle: true,
    project: { projectTitle: true, projectColor: true },
  });

useLiveQuery((builder) => q.buildLive(builder));
const nested = q.nest(flatRows);
```

### Idea C — declarative include spec

```ts
import { includeQuery } from "@party-stack/ontology-query";

const plan = includeQuery(ontology, {
  from: "Issue",
  select: {
    issueId: true,
    project: { projectTitle: true },
  },
});
```

`compileIncludeQuery` walks the selection tree, resolves each link via IR, and
emits join plans. ONE links nest as objects; MANY links group into arrays.

## 2. Relay-style fragments

Components declare a fragment (selection over an object type). Pages stitch
fragments into one include query and pass opaque-ish refs down. `useFragment`
masks parent data to the fragment contract.

```ts
import { fragment } from "@party-stack/ontology-query";
import { useFragment, useStitchedQuery } from "@party-stack/ontology-query/react";

const KanbanCardFragment = fragment("KanbanCard", "Issue", {
  issueId: true,
  issueTitle: true,
  project: { projectTitle: true, projectColor: true },
});

function Board({ ontology }) {
  const { data } = useStitchedQuery(ontology, "Issue", [KanbanCardFragment]);
  return data.map((issue) => <KanbanCard issue={issue} />);
}

function KanbanCard({ issue }) {
  const data = useFragment(KanbanCardFragment, issue);
  return <h3>{data?.issueTitle}</h3>;
}
```

No GraphQL runtime or Relay compiler — the fragment is a typed selection object
that compiles to the same include/join layer.

## Status

Prototype for the issue-tracker demo. Expect API churn; link typing is
stringly-typed against IR at runtime (stronger codegen can come later).
