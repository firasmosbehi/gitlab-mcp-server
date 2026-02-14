import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListIssueNotesTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_issue_notes",
  description: "List issue notes (comments) for a GitLab issue.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Issue IID (project-scoped)." },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listIssueNotes(args.project, args.iid, { page: args.page, per_page: args.per_page });
  },
};

