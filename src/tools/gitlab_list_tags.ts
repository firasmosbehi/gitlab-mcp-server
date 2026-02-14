import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  search: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListTagsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_tags",
  description: "List repository tags for a GitLab project.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      search: { type: "string", description: "Optional tag name search query." },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listTags({
      project: args.project,
      search: args.search,
      page: args.page,
      per_page: args.per_page,
    });
  },
};

