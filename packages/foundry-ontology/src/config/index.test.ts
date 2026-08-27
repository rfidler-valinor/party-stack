import { o, type OntologyIR } from "@party-stack/ontology";
import { describe, expect, it, vi } from "vitest";
import { createFoundryOntologyClient, foundryOntologyConfigAdapter } from "./index.js";

vi.mock("@bobbyfidz/local-oauth-flow", () => ({
    performLocalOAuthFlow: vi.fn(() => Promise.resolve({ accessToken: "oauth-token" })),
}));

describe("createFoundryOntologyClient", () => {
    it("uses a supplied token instead of the interactive OAuth flow", async () => {
        const { performLocalOAuthFlow } = await import("@bobbyfidz/local-oauth-flow");

        const client = await createFoundryOntologyClient({
            foundryUrl: "https://foundry.example.com",
            foundryOntologyRid: "ri.ontology.main.ontology.example",
            foundryClientId: "",
            foundryRedirectUrl: "",
            foundryToken: "provided-token",
        });

        expect(performLocalOAuthFlow).not.toHaveBeenCalled();
        await expect(client.tokenProvider()).resolves.toBe("provided-token");
    });

    it("falls back to the OAuth flow when no token is supplied", async () => {
        const client = await createFoundryOntologyClient({
            foundryUrl: "https://foundry.example.com",
            foundryOntologyRid: "ri.ontology.main.ontology.example",
            foundryClientId: "client",
            foundryRedirectUrl: "http://localhost:8080/callback",
        });

        await expect(client.tokenProvider()).resolves.toBe("oauth-token");
    });
});

describe("foundryOntologyConfigAdapter", () => {
    it("applies targeted attachment constraints after pull", async () => {
        const ir: OntologyIR = {
            types: [],
            objectTypes: [
                {
                    name: "Task",
                    displayName: "Task",
                    pluralDisplayName: "Tasks",
                    primaryKey: "id",
                    properties: [
                        { name: "id", displayName: "ID", type: o.string({}) },
                        {
                            name: "media",
                            displayName: "Media",
                            type: o.attachment({
                                meta: { type: "media" },
                            }),
                        },
                    ],
                },
            ],
            linkTypes: [],
            actionTypes: [
                {
                    name: "createTask",
                    displayName: "Create Task",
                    parameters: [
                        {
                            name: "media",
                            displayName: "Media",
                            type: o.optional({
                                type: o.attachment({
                                    meta: { type: "media" },
                                }),
                            }),
                        },
                    ],
                    logic: [],
                },
            ],
            queryFunctionTypes: [],
        };
        const constraint = {
            content: o.AttachmentContentConstraint.image({
                mediaTypes: ["image/png", "image/jpeg"],
            }),
        };

        const transformed = await foundryOntologyConfigAdapter.transformOntology!(ir, {
            attachmentConstraints: [
                {
                    target: {
                        kind: "objectProperty",
                        objectType: "Task",
                        property: "media",
                    },
                    constraint,
                },
                {
                    target: {
                        kind: "actionParameter",
                        actionType: "createTask",
                        parameter: "media",
                    },
                    constraint,
                },
            ],
        });

        expect(transformed.objectTypes[0]?.properties[1]?.type).toEqual(
            o.attachment({
                constraint,
                meta: { type: "media" },
            })
        );
        expect(transformed.actionTypes[0]?.parameters[0]?.type).toEqual(
            o.optional({
                type: o.attachment({
                    constraint,
                    meta: { type: "media" },
                }),
            })
        );
    });
});
