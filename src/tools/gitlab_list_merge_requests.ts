import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  state: z.enum(["opened", "closed", "merged", "all"]).optional(),
  search: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListMergeRequestsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_merge_requests",
  description: "List merge requests for a GitLab project.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      state: { type: "string", enum: ["opened", "closed", "merged", "all"] },
      search: { type: "string" },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listMergeRequests({
      project: args.project,
      state: args.state,
      search: args.search,
      page: args.page,
      per_page: args.per_page,
    });
  },
};
