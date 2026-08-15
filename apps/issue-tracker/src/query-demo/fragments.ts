import { fragment } from "@party-stack/ontology-query";

/**
 * Kanban card data requirements — declared as a fragment over Issue, including
 * the `project` link. The board page stitches this into one include query.
 */
export const KanbanCardFragment = fragment("KanbanCard", "Issue", {
    issueId: true,
    issueTitle: true,
    issueDescription: true,
    issueStatus: true,
    issueUpdatedAt: true,
    issueAttachments: true,
    projectId: true,
    project: {
        projectTitle: true,
        projectColor: true,
    },
});

/** Extra fields the board needs for mutations / filtering beyond the card UI. */
export const IssueBoardExtraSelection = {
    issueCreatedAt: true,
    issueCompletedAt: true,
} as const;

/**
 * Issue detail header needs the linked project for the breadcrumb chip.
 */
export const IssueDetailsFragment = fragment("IssueDetails", "Issue", {
    issueId: true,
    issueTitle: true,
    issueDescription: true,
    issueStatus: true,
    issueUpdatedAt: true,
    issueCreatedAt: true,
    issueCompletedAt: true,
    issueAttachments: true,
    projectId: true,
    project: {
        projectId: true,
        projectTitle: true,
        projectColor: true,
    },
});

/**
 * Project sidebar row — demonstrates a fragment without link includes.
 */
export const ProjectListItemFragment = fragment("ProjectListItem", "Project", {
    projectId: true,
    projectTitle: true,
    projectColor: true,
    projectDescription: true,
});

/**
 * Project → issues include for the Query Lab MANY-link demo.
 */
export const ProjectWithIssuesFragment = fragment("ProjectWithIssues", "Project", {
    projectId: true,
    projectTitle: true,
    projectColor: true,
    issues: {
        issueId: true,
        issueTitle: true,
        issueStatus: true,
    },
});
