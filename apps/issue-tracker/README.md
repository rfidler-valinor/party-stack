# Issue Tracker

A TanStack Start app for an Issue and Project Foundry ontology.

## Pull the ontology

Set the Foundry environment variables, then run:

```bash
pnpm ontology:pull
```

The pull uses `src/ontology/config.ts` and generates the ontology and TypeScript
bindings under `src/ontology`.

## Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Query lab (prototype)

Open [http://localhost:3000/query-lab](http://localhost:3000/query-lab) for a
demo of `@party-stack/ontology-query`:

1. IR-aware link joins / nested includes (helpers, builder, and include spec)
2. Relay-style fragments stitched into a single page query

The main board also uses fragment stitching for the issue list (`KanbanCardFragment`)
and nested `project` includes in the issue detail panel.
