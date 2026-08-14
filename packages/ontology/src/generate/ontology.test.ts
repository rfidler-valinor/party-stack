import { describe, expect, it } from "vitest";
import { o } from "../ir/index.js";
import { generateOntology } from "./ontology.js";
import type { OntologyIR } from "../ir/index.js";

describe("generateOntology", () => {
    it("preserves object and action presentation metadata", () => {
        const ontology: OntologyIR = {
            types: [],
            objectTypes: [
                {
                    name: "Employee",
                    displayName: "Employee",
                    pluralDisplayName: "Employees",
                    primaryKey: "id",
                    title: "name",
                    icon: "user",
                    properties: [
                        { name: "id", displayName: "ID", type: o.string({}) },
                        { name: "name", displayName: "Name", type: o.string({}) },
                    ],
                },
            ],
            linkTypes: [],
            actionTypes: [
                {
                    name: "createEmployee",
                    displayName: "Create employee",
                    icon: "user-plus",
                    parameters: [],
                    logic: [],
                },
            ],
            queryFunctionTypes: [],
        };

        const generated = generateOntology(ontology);
        expect(generated).toContain('title: "name"');
        expect(generated).toContain('icon: "user"');
        expect(generated).toContain('icon: "user-plus"');
    });
});
