import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_DESCRIPTION_CHARS = 50_000;
const MAX_LABELS = 30;

const Schema = z.object({
  project: z.string().min(1),
  source_branch: z.string().min(1),
  target_branch: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().max(MAX_DESCRIPTION_CHARS).optional(),
  draft: z.boolean().optional().default(false),
  remove_source_branch: z.boolean().optional(),
  labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
  assignee_id: z.number().int().min(1).optional(),
  reviewer_ids: z.array(z.number().int().min(1)).max(20).optional(),
});

function toDraftTitle(title: string, draft: boolean): string {
  if (!draft) return title;
  if (/^draft:\s*/i.test(title)) return title;
  return `Draft: ${title}`;
}

export const gitlabCreateMergeRequestTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_merge_request",
  description: "Create a GitLab merge request (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "source_branch", "title"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      source_branch: { type: "string", description: "Source branch name." },
      target_branch: {
        type: "string",
        description: "Target branch name. Defaults to project default branch.",
      },
      title: { type: "string", description: "Merge request title." },
      description: { type: "string", description: "Merge request description." },
      draft: { type: "boolean", description: "If true, prefixes title with 'Draft:'." },
      remove_source_branch: {
        type: "boolean",
        description: "If true, remove source branch when MR is merged.",
      },
      labels: { type: "array", items: { type: "string" } },
      assignee_id: { type: "number", description: "Assignee user ID." },
      reviewer_ids: { type: "array", items: { type: "number" }, description: "Reviewer user IDs." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);

    return ctx.gitlab.createMergeRequest(
      args.project,
      args.source_branch,
      args.target_branch,
      toDraftTitle(args.title, args.draft),
      {
        description: args.description,
        labels: args.labels,
        removeSourceBranch: args.remove_source_branch,
        assigneeId: args.assignee_id,
        reviewerIds: args.reviewer_ids,
      },
    );
  },
};

