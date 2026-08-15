import { describe, expect, it } from "vitest";
import { fragment } from "./fragment.js";
import { mergeSelections, readFragmentData, stitchFragments } from "./stitch.js";

const KanbanCardFragment = fragment("KanbanCard", "Issue", {
    issueId: true,
    issueTitle: true,
    project: {
        projectTitle: true,
        projectColor: true,
    },
});

const IssueStatusFragment = fragment("IssueStatus", "Issue", {
    issueId: true,
    issueStatus: true,
    project: {
        projectId: true,
    },
});

describe("stitchFragments", () => {
    it("merges nested selections from multiple fragments", () => {
        const stitched = stitchFragments("Issue", [KanbanCardFragment, IssueStatusFragment]);
        expect(stitched.fragmentNames).toEqual(["KanbanCard", "IssueStatus"]);
        expect(stitched.select).toEqual({
            issueId: true,
            issueTitle: true,
            issueStatus: true,
            project: {
                projectTitle: true,
                projectColor: true,
                projectId: true,
            },
        });
    });

    it("rejects fragments of the wrong type", () => {
        const projectFragment = fragment("ProjectChip", "Project", {
            projectTitle: true,
        });
        expect(() =>
            stitchFragments("Issue", [KanbanCardFragment, projectFragment as never])
        ).toThrow(/Cannot stitch fragment/);
    });
});

describe("mergeSelections", () => {
    it("deep-merges link selections", () => {
        expect(
            mergeSelections(
                { title: true, author: { name: true } },
                { status: true, author: { email: true } }
            )
        ).toEqual({
            title: true,
            status: true,
            author: { name: true, email: true },
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
