import { o, type OntologyIR } from "@party-stack/ontology";
import { describe, expect, it } from "vitest";
import { listLinks, resolveLink } from "./resolveLink.js";

const ir: OntologyIR = {
    types: [],
    objectTypes: [
        {
            name: "Issue",
            displayName: "Issue",
            pluralDisplayName: "Issues",
            primaryKey: "issueId",
            properties: [
                { name: "issueId", displayName: "Issue ID", type: o.string({}) },
                { name: "issueTitle", displayName: "Title", type: o.string({}) },
                { name: "projectId", displayName: "Project ID", type: o.string({}) },
            ],
        },
        {
            name: "Project",
            displayName: "Project",
            pluralDisplayName: "Projects",
            primaryKey: "projectId",
            properties: [
                { name: "projectId", displayName: "Project ID", type: o.string({}) },
                { name: "projectTitle", displayName: "Title", type: o.string({}) },
                { name: "projectColor", displayName: "Color", type: o.string({}) },
            ],
        },
    ],
    linkTypes: [
        {
            id: "project-issues",
            source: { objectType: "Project", name: "project", displayName: "Project" },
            target: { objectType: "Issue", name: "issues", displayName: "Issues" },
            foreignKey: "projectId",
            cardinality: "one",
        },
    ],
    actionTypes: [],
    queryFunctionTypes: [],
};

describe("resolveLink", () => {
    it("resolves Issue.project as a to-one join onto Project", () => {
        const link = resolveLink(ir, "Issue", "project");
        expect(link).toMatchObject({
            linkName: "project",
            fromObjectType: "Issue",
            toObjectType: "Project",
            cardinality: "one",
            foreignKey: "projectId",
            foreignKeyObjectType: "Issue",
            fromKey: "projectId",
            toKey: "projectId",
        });
    });

    it("resolves Project.issues as a to-many join onto Issue", () => {
        const link = resolveLink(ir, "Project", "issues");
        expect(link).toMatchObject({
            linkName: "issues",
            fromObjectType: "Project",
            toObjectType: "Issue",
            cardinality: "many",
            foreignKey: "projectId",
            foreignKeyObjectType: "Issue",
            fromKey: "projectId",
            toKey: "projectId",
        });
    });

    it("lists both directions", () => {
        expect(listLinks(ir, "Issue").map((link) => link.linkName)).toEqual(["project"]);
        expect(listLinks(ir, "Project").map((link) => link.linkName)).toEqual(["issues"]);
    });

    it("throws for unknown links", () => {
        expect(() => resolveLink(ir, "Issue", "author")).toThrow(/No link "author"/);
    });
});
