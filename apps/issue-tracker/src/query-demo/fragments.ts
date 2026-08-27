import {
    createFragmentFactory,
    createSelectionFactory,
} from "@party-stack/ontology-query";
import type { IssueTrackerOntology } from "../ontology/generated/types";

const fragment = createFragmentFactory<IssueTrackerOntology>();
const select = createSelectionFactory<IssueTrackerOntology>();

/**
 * Kanban card data requirements — declared as a fragment over Issue, including
 * the `project` link. The board page stitches this into one include query.
 */
export const KanbanCardFragment = fragment(
    "KanbanCard",
    "Issue",
    ({ fields, related }) => [
        fields(
            "issueId",
            "issueTitle",
            "issueDescription",
            "issueStatus",
            "issueUpdatedAt",
            "issueAttachments",
            "projectId"
        ),
        related("project", ({ fields: projectFields }) =>
            projectFields("projectTitle", "projectColor")
        ),
    ]
);

/** Stable list for page-level stitching (avoid re-creating arrays each render). */
export const IssueBoardFragments = [KanbanCardFragment] as const;

/** Extra fields the board needs for mutations / filtering beyond the card UI. */
export const IssueBoardExtraSelection = select("Issue", ({ fields }) =>
    fields("issueCreatedAt", "issueCompletedAt")
);

/**
 * Issue detail header needs the linked project for the breadcrumb chip.
 */
export const IssueDetailsFragment = fragment(
    "IssueDetails",
    "Issue",
    ({ fields, related }) => [
        fields(
            "issueId",
            "issueTitle",
            "issueDescription",
            "issueStatus",
            "issueUpdatedAt",
            "issueCreatedAt",
            "issueCompletedAt",
            "issueAttachments",
            "projectId"
        ),
        related("project", ({ fields: projectFields }) =>
            projectFields("projectId", "projectTitle", "projectColor")
        ),
    ]
);

/**
 * Project sidebar row — demonstrates a fragment without link includes.
 */
export const ProjectListItemFragment = fragment(
    "ProjectListItem",
    "Project",
    ({ fields }) =>
        fields(
            "projectId",
            "projectTitle",
            "projectColor",
            "projectDescription"
        )
);

/**
 * Project → issues include for the Query Lab MANY-link demo.
 */
export const ProjectWithIssuesFragment = fragment(
    "ProjectWithIssues",
    "Project",
    ({ fields, related }) => [
        fields("projectId", "projectTitle", "projectColor"),
        related("issues", ({ fields: issueFields }) =>
            issueFields("issueId", "issueTitle", "issueStatus")
        ),
    ]
);
