import { describe, expect, it } from "vitest";
import type { OntologyIR } from "@party-stack/ontology";
import { createFoundryOntologyRoute } from "./createFoundryBackendInstallation.js";

const ir: OntologyIR = {
    types: [],
    objectTypes: [],
    linkTypes: [],
    actionTypes: [],
    queryFunctionTypes: [],
};

describe("createFoundryOntologyRoute", () => {
    it("creates a metadata-only route when IR is omitted", () => {
        const route = createFoundryOntologyRoute({
            ontologyId: "ri.ontology.main",
        })("https://foundry.example");

        expect(route.configure === undefined).toBe(true);
        expect(route.configureMeta !== undefined).toBe(true);
    });

    it("defers IR metadata projection to the installation", () => {
        const route = createFoundryOntologyRoute({
            ontologyId: "ri.ontology.main",
            ir,
        })("https://foundry.example");

        expect(route.configure !== undefined).toBe(true);
        expect(route.configureMeta === undefined).toBe(true);
    });

    it("forwards live to configured ontology backends", async () => {
        const route = createFoundryOntologyRoute({
            ontologyId: "ri.ontology.main",
            ir,
            live: false,
        })("https://foundry.example");
        const configuration = await route.configure!({
            connection: {
                userId: "user-1",
                state: { status: "active" },
            },
            egress: {
                fetch: globalThis.fetch,
                createWebSocket: () => Promise.reject(new Error("not used")),
            },
            ontologyId: "ri.ontology.main",
        } as never);

        await expect(configuration.backend(ir, {})).resolves.toMatchObject({
            name: "foundry",
            live: false,
        });
    });
});
