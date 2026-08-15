import { describe, expect, it } from "vitest";
import { createSelectionFactory } from "../query/selection.js";
import { createFragmentFactory } from "./fragment.js";
import { mergeSelections, readFragmentData, stitchFragments } from "./stitch.js";

type TestOntology = {
    objectTypes: {
        Issue: { issueId: string; issueTitle: string; issueStatus: string };
        Project: {
            projectId: string;
            projectTitle: string;
            projectColor: string;
        };
    };
    linkTypes: {
        Issue: { project: { target: "Project"; cardinality: "one" } };
        Project: { issues: { target: "Issue"; cardinality: "many" } };
    };
};

const fragment = createFragmentFactory<TestOntology>();
const select = createSelectionFactory<TestOntology>();
const KanbanCardFragment = fragment(
    "KanbanCard",
    "Issue",
    ({ fields, related }) => [
        fields("issueId", "issueTitle"),
        related("project", ({ fields: projectFields }) =>
            projectFields("projectTitle", "projectColor")
        ),
    ]
);

const IssueStatusFragment = fragment(
    "IssueStatus",
    "Issue",
    ({ fields, related }) => [
        fields("issueId", "issueStatus"),
        related("project", ({ fields: projectFields }) =>
            projectFields("projectId")
        ),
    ]
);

describe("stitchFragments", () => {
    it("merges nested selections from multiple fragments", () => {
        const stitched = stitchFragments("Issue", [KanbanCardFragment, IssueStatusFragment]);
        expect(stitched.fragmentNames).toEqual(["KanbanCard", "IssueStatus"]);
        expect(stitched.select).toEqual({
            fields: ["issueId", "issueTitle", "issueStatus"],
            relations: {
                project: {
                    fields: ["projectTitle", "projectColor", "projectId"],
                    relations: {},
                },
            },
        });
    });

    it("rejects fragments of the wrong type", () => {
        const projectFragment = fragment(
            "ProjectChip",
            "Project",
            ({ fields }) => fields("projectTitle")
        );
        expect(() =>
            stitchFragments("Issue", [KanbanCardFragment, projectFragment as never])
        ).toThrow(/Cannot stitch fragment/);
    });
});

describe("mergeSelections", () => {
    it("deep-merges link selections", () => {
        expect(
            mergeSelections(
                select("Issue", ({ fields, related }) => [
                    fields("issueTitle"),
                    related("project", ({ fields: projectFields }) =>
                        projectFields("projectTitle")
                    ),
                ]),
                select("Issue", ({ fields, related }) => [
                    fields("issueStatus"),
                    related("project", ({ fields: projectFields }) =>
                        projectFields("projectColor")
                    ),
                ])
            )
        ).toEqual({
            fields: ["issueTitle", "issueStatus"],
            relations: {
                project: {
                    fields: ["projectTitle", "projectColor"],
                    relations: {},
                },
            },
        });
    });
});

describe("readFragmentData", () => {
    it("masks parent data to the fragment selection", () => {
        const masked = readFragmentData(KanbanCardFragment, {
            issueId: "i1",
            issueTitle: "Bug",
            issueStatus: "Open",
            secret: "nope",
            project: {
                projectTitle: "Alpha",
                projectColor: "#f00",
                projectDescription: "hidden",
            },
        });

        expect(masked).toEqual({
            issueId: "i1",
            issueTitle: "Bug",
            project: {
                projectTitle: "Alpha",
                projectColor: "#f00",
            },
        });
    });
});
