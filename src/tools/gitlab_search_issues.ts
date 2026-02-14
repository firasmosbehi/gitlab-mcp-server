import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  query: z.string().min(1).optional(),
  state: z.enum(["opened", "closed", "all"]).optional(),
  labels: z.array(z.string().min(1)).optional(),
  assignee: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabSearchIssuesTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_search_issues",
  description: "Search issues within a GitLab project.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      query: { type: "string", description: "Search query." },
      state: { type: "string", enum: ["opened", "closed", "all"] },
      labels: { type: "array", items: { type: "string" } },
      assignee: { type: "string", description: "Assignee username." },
      author: { type: "string", description: "Author username." },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.searchIssues({
      project: args.project,
      query: args.query,
      state: args.state,
      labels: args.labels,
      assignee: args.assignee,
      author: args.author,
      page: args.page,
      per_page: args.per_page,
    });
  },
};
