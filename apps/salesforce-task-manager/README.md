# Salesforce Task Manager

Consumer example for the Salesforce ontology installation and pull lifecycle.

## Generate the ontology

Configure an OAuth-enabled Salesforce External Client App as documented in
`packages/salesforce-client/README.md`, then:

```sh
cp .env.example .env
pnpm ontology:pull
pnpm ontology:generate
```

The pull command:

1. Creates a Salesforce backend installation.
2. Restores or opens a Party Stack public-OAuth connection.
3. Opens the Salesforce metadata ontology.
4. Pulls `Task` and `User` metadata.
5. Emits `src/ontology/ontology.ts`.

## Verify the runtime

```sh
pnpm runtime:smoke
```

This opens the emitted ontology through the same installation, queries the
runtime `Task` collection, and prints the number of live Salesforce records
returned.

## Run the complete POC

```sh
pnpm demo
```

The TanStack Start app lives entirely in this package and opens Salesforce
directly in the browser through `createWebRuntime` and OAuth PKCE. It reads
`Task` and `User` through the generated `LiveOntology`; create, update, and
delete use the generated `createTask`, `updateTask`, and `deleteTask` actions.
JSforce subscribes to Salesforce `TaskChangeEvent` notifications in-browser.
The metadata panel searches the live meta ontology and batch-loads complete
action definitions through the Composite API.
