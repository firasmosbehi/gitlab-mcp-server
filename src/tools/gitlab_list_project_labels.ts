import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  search: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListProjectLabelsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_project_labels",
  description: "List labels for a GitLab project.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      search: { type: "string", description: "Optional label name search query." },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listProjectLabels({
      project: args.project,
      search: args.search,
      page: args.page,
      per_page: args.per_page,
    });
  },
};

