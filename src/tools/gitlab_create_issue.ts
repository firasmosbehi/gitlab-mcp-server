import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_LABELS = 50;

const Schema = z.object({
  project: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  labels: z.array(z.string().min(1)).max(MAX_LABELS).optional(),
});

export const gitlabCreateIssueTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_issue",
  description: "Create an issue in a GitLab project (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "title"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      title: { type: "string", description: "Issue title." },
      description: { type: "string", description: "Issue description (markdown supported)." },
      labels: { type: "array", items: { type: "string" }, description: "Optional labels." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.createIssue(args.project, args.title, {
      description: args.description,
      labels: args.labels,
    });
  },
};

