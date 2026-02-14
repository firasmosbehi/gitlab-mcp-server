import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_LABELS = 50;

const Schema = z
  .object({
    project: z.string().min(1),
    iid: z.number().int().positive(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    state_event: z.enum(["close", "reopen"]).optional(),
    labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
    add_labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
    remove_labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
  })
  .superRefine((v, ctx) => {
    const hasAnyUpdate =
      v.title !== undefined ||
      v.description !== undefined ||
      v.state_event !== undefined ||
      v.labels !== undefined ||
      v.add_labels !== undefined ||
      v.remove_labels !== undefined;

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

export const gitlabUpdateIssueTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_update_issue",
  description: "Update an issue in a GitLab project (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Issue IID (project-scoped)." },
      title: { type: "string", description: "New issue title." },
      description: { type: "string", description: "New issue description (markdown supported)." },
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
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.updateIssue(args.project, args.iid, {
      title: args.title,
      description: args.description,
      stateEvent: args.state_event,
      labels: args.labels,
      addLabels: args.add_labels,
      removeLabels: args.remove_labels,
    });
  },
};

