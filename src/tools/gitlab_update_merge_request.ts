import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_DESCRIPTION_CHARS = 100_000;
const MAX_LABELS = 50;

const Schema = z
  .object({
    project: z.string().min(1),
    iid: z.number().int().positive(),
    title: z.string().min(1).optional(),
    description: z.string().max(MAX_DESCRIPTION_CHARS).optional(),
    state_event: z.enum(["close", "reopen"]).optional(),
    labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
    add_labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
    remove_labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
    assignee_id: z.number().int().min(1).optional(),
    reviewer_ids: z.array(z.number().int().min(1)).max(20).optional(),
    target_branch: z.string().min(1).optional(),
    remove_source_branch: z.boolean().optional(),
    squash: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    const hasAnyUpdate =
      v.title !== undefined ||
      v.description !== undefined ||
      v.state_event !== undefined ||
      v.labels !== undefined ||
      v.add_labels !== undefined ||
      v.remove_labels !== undefined ||
      v.assignee_id !== undefined ||
      v.reviewer_ids !== undefined ||
      v.target_branch !== undefined ||
      v.remove_source_branch !== undefined ||
      v.squash !== undefined;

    if (!hasAnyUpdate) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one update field must be provided.",
      });
    }

    if (v.labels !== undefined && (v.add_labels !== undefined || v.remove_labels !== undefined)) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "Use either 'labels' (replace) OR 'add_labels'/'remove_labels' (patch), not both.",
      });
    }
  });

export const gitlabUpdateMergeRequestTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_update_merge_request",
  description: "Update a GitLab merge request (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      title: { type: "string", description: "New merge request title." },
      description: { type: "string", description: "New merge request description (markdown supported)." },
      state_event: { type: "string", enum: ["close", "reopen"] },
      labels: {
        type: "array",
        items: { type: "string" },
        description: "Replace the full label set.",
      },
      add_labels: {
        type: "array",
        items: { type: "string" },
        description: "Add labels (without replacing existing labels).",
      },
      remove_labels: {
        type: "array",
        items: { type: "string" },
        description: "Remove labels (without affecting other labels).",
      },
      assignee_id: { type: "number", description: "Assignee user ID." },
      reviewer_ids: { type: "array", items: { type: "number" }, description: "Reviewer user IDs." },
      target_branch: { type: "string", description: "New target branch name." },
      remove_source_branch: { type: "boolean", description: "If true, remove source branch when merged." },
      squash: { type: "boolean", description: "If true, squash commits when merging." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);

    return ctx.gitlab.updateMergeRequest(args.project, args.iid, {
      title: args.title,
      description: args.description,
      stateEvent: args.state_event,
      labels: args.labels,
      addLabels: args.add_labels,
      removeLabels: args.remove_labels,
      assigneeId: args.assignee_id,
      reviewerIds: args.reviewer_ids,
      targetBranch: args.target_branch,
      removeSourceBranch: args.remove_source_branch,
      squash: args.squash,
    });
  },
};

