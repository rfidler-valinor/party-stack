# Ontology-aware TanStack DB queries and fragments

Status: prototype / design spike

## Decisions

1. **TanStack DB remains the query language and execution engine.**
   Ontology utilities contribute typed collections, correlation predicates, and
   selection metadata. They do not replace `QueryBuilder`.
2. **No `{ field: true }` selection syntax.** Fragments use typed
   `fields(...)` and `related(...)` declarations.
3. **Compiled ontology queries end as normal TanStack query IR.** The compiler
   may build a `QueryBuilder` and extract its IR, but it must not introduce a
   second runtime or require result re-grouping outside TanStack.
4. **Ontology codegen owns link typing.** Generated ontology types include
   source type, link name, target type, and cardinality. Runtime IR remains the
   authority for foreign-key resolution.

## Layer 1: relation descriptors for ordinary TanStack queries

`createOntologyRelations(ontology)` binds generated ontology types and runtime
IR:

```ts
const { related } = createOntologyRelations(ontology);
const project = related("Issue", "project");

const query = q
  .from({ Issue: ontology.objects.Issue })
  .leftJoin(
    { project: project.collection },
    project.on("Issue", "project"),
  )
  .where(({ Issue }) => eq(Issue.issueStatus, "Open"))
  .groupBy(({ project }) => project.projectId)
  .having(({ Issue }) => gt(count(Issue.issueId), 2))
  .orderBy(({ project }) => project.projectTitle)
  .select(({ Issue, project }) => ({
    issueId: Issue.issueId,
    projectTitle: project?.projectTitle,
  }));
```

The utility only supplies the target collection and IR-derived `on` predicate.
Every clause before and after the join is the existing TanStack API.

### Correlated includes

To-many relations should compile to TanStack `IncludesSubquery`, not a flat
join followed by JavaScript grouping:

```ts
const issues = related("Project", "issues");

q.from({ Project: ontology.objects.Project }).select(({ Project }) => ({
  projectId: Project.projectId,
  projectTitle: Project.projectTitle,
  openIssues: issues.toArray(q, Project, (child) =>
    child
      .where(({ related }) => eq(related.issueStatus, "Open"))
      .orderBy(({ related }) => related.issueUpdatedAt, "desc")
      .limit(20)
      .select(({ related }) => ({
        issueId: related.issueId,
        issueTitle: related.issueTitle,
      })),
  ),
}));
```

`one(...)` is the singleton equivalent and compiles through
`materialize(child.findOne())`. Child queries retain filters, ordering,
pagination, grouping, aggregation, and nested includes.

## Layer 2: ontology query compiler

The fluent experiment remains useful when a page wants a reusable declarative
query, but its terminal output must be a TanStack query function / IR:

```ts
const issueFeed = ontologyQuery<IssueTrackerOntology>()
  .from("Issue", { as: "issue" })
  .related("project", { as: "project", join: "left" })
  .where(({ issue }, input: FeedInput) =>
    and(
      eq(issue.issueStatus, input.status),
      ilike(issue.issueTitle, `${input.search}%`),
    ),
  )
  .select(({ issue, project }) => ({
    issueId: issue.issueId,
    title: issue.issueTitle,
    project: {
      title: project?.projectTitle,
      color: project?.projectColor,
    },
  }))
  .orderBy(({ issue }) => issue.issueUpdatedAt, "desc")
  .limit(({ pageSize }) => pageSize);

const queryFn = issueFeed.toQuery(ontology, input);
const queryIR = issueFeed.toQueryIR(ontology, input);
useLiveQuery(queryFn, [ontology, input]);
```

### Required builder surface

The scalable version must support:

- `from` with aliases and subqueries
- all join kinds and repeated/self relations
- `related` joins and correlated relation includes
- repeated `where` clauses with typed query input
- `select` with TanStack expressions and nested includes
- `groupBy`, aggregate functions, and `having`
- `orderBy`, `limit`, `offset`, and keyset pagination helpers
- `distinct`
- `findOne`
- `unionAll`
- reusable subqueries
- parameters separated from structural compilation so query plans stay stable
- explicit aliases for multiple paths to the same target
- cycle/depth diagnostics for recursive fragment spreads

Each method records a structural clause. `toQuery()` replays those clauses onto
`InitialQueryBuilder`; `toQueryIR()` extracts the resulting TanStack `QueryIR`.
The compiler must not maintain a separate evaluator.

### Compilation by cardinality

| Ontology operation | TanStack output |
| --- | --- |
| to-one relation used by filters/aggregates | normal `join` |
| to-one relation only projected as nested data | correlated `materialize(...findOne())` |
| to-many nested relation | correlated `toArray(...)` / `IncludesSubquery` |
| aggregate over relation | subquery or join + `groupBy` according to explicit strategy |
| page-level filter/order/pagination | ordinary root builder clauses |

The compiler should expose the chosen plan for devtools and tests.

## Typed fragments

Codegen adds a `linkTypes` map to each generated ontology:

```ts
type IssueTrackerOntology = {
  objectTypes: { Issue: Issue; Project: Project };
  linkTypes: {
    Issue: {
      project: { target: "Project"; cardinality: "one" };
    };
    Project: {
      issues: { target: "Issue"; cardinality: "many" };
    };
  };
  // actions / query functions...
};
```

Fragments bind to that generated type:

```ts
const fragment = createFragmentFactory<IssueTrackerOntology>();

const KanbanCardFragment = fragment(
  "KanbanCard",
  "Issue",
  ({ fields, related }) => [
    fields("issueId", "issueTitle", "issueStatus"),
    related("project", ({ fields }) =>
      fields("projectTitle", "projectColor"),
    ),
  ],
);
```

This rejects:

- object types not in the ontology
- scalar fields not on the selected object type
- links not reachable from that type
- fields invalid on a relation target
- cross-ontology fragment stitching

The inferred fragment data uses generated property types and link cardinality:
`project` is `ProjectSelection | null`; `issues` is
`Array<IssueSelection>`.

## Fragment stitching

Fragments merge normalized field lists and relation trees. The page compiler
then emits one TanStack query:

- root scalar fields become the root `select`
- to-one paths may be joins or singleton includes
- to-many paths become correlated includes
- duplicate paths merge recursively
- component reads remain masked to their fragment

Fragments are data requirements, not a second query language: filters,
aggregations, sorting, and pagination stay in the page's TanStack query or
compiled query definition.

## Open questions

1. Should to-one projection default to a join or singleton include?
2. Should `related("project")` infer the source object from a typed alias
   registry, or keep the explicit `"Issue"` argument?
3. Do we expose `_getQuery()` while TanStack does not publicly export
   `getQueryIR`, or propose a public upstream API first?
4. How should fragment pagination arguments compose when multiple components
   request the same to-many relation?
5. Should generated link metadata live in `types.ts`, a dedicated
   `query-types.ts`, or both?

