import { o, type OntologyIR } from "@party-stack/ontology";
import { describe, expect, it } from "vitest";
import { nestIncludeRows } from "./applyIncludeQuery.js";
import { compileIncludeQuery } from "./selection.js";

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

describe("compileIncludeQuery", () => {
    it("plans a left join for Issue → project", () => {
        const compiled = compileIncludeQuery(ir, {
            from: "Issue",
            select: {
                issueId: true,
                issueTitle: true,
                project: {
                    projectTitle: true,
                    projectColor: true,
                },
            },
        });

        expect(compiled.rootAlias).toBe("Issue");
        expect(compiled.joins).toEqual([
            expect.objectContaining({
                alias: "project",
                objectType: "Project",
                linkName: "project",
                fromAlias: "Issue",
                fromKey: "projectId",
                toKey: "projectId",
                cardinality: "one",
            }),
        ]);
        expect(compiled.fieldsByAlias.Issue).toEqual(
            expect.arrayContaining(["issueId", "issueTitle", "projectId"])
        );
        expect(compiled.fieldsByAlias.project).toEqual(
            expect.arrayContaining(["projectTitle", "projectColor", "projectId"])
        );
    });

    it("plans Project → issues as many", () => {
        const compiled = compileIncludeQuery(ir, {
            from: "Project",
            select: {
                projectId: true,
                projectTitle: true,
                issues: {
                    issueId: true,
                    issueTitle: true,
                },
            },
        });
        expect(compiled.joins[0]?.cardinality).toBe("many");
    });
});

describe("nestIncludeRows", () => {
    it("nests to-one project links", () => {
        const compiled = compileIncludeQuery(ir, {
            from: "Issue",
            select: {
                issueId: true,
                issueTitle: true,
                project: { projectTitle: true, projectColor: true },
            },
        });

        const nested = nestIncludeRows(compiled, [
            {
                issueId: "i1",
                issueTitle: "Bug",
                projectId: "p1",
                project__projectId: "p1",
                project__projectTitle: "Alpha",
                project__projectColor: "#f00",
            },
        ]);

        expect(nested).toEqual([
            {
                issueId: "i1",
                issueTitle: "Bug",
                project: {
                    projectTitle: "Alpha",
                    projectColor: "#f00",
                },
            },
        ]);
    });

    it("groups to-many issues under a project", () => {
        const compiled = compileIncludeQuery(ir, {
            from: "Project",
            select: {
                projectId: true,
                projectTitle: true,
                issues: { issueId: true, issueTitle: true },
            },
        });

        const nested = nestIncludeRows(compiled, [
            {
                projectId: "p1",
                projectTitle: "Alpha",
                issues__issueId: "i1",
                issues__issueTitle: "Bug",
                issues__projectId: "p1",
            },
            {
                projectId: "p1",
                projectTitle: "Alpha",
                issues__issueId: "i2",
                issues__issueTitle: "Feat",
                issues__projectId: "p1",
            },
        ]);

        expect(nested).toEqual([
            {
                projectId: "p1",
                projectTitle: "Alpha",
                issues: [
                    { issueId: "i1", issueTitle: "Bug" },
                    { issueId: "i2", issueTitle: "Feat" },
                ],
            },
        ]);
    });
});
