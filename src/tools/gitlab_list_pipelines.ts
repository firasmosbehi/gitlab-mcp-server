import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  ref: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListPipelinesTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_pipelines",
  description: "List GitLab pipelines for a project.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      ref: { type: "string" },
      status: { type: "string" },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listPipelines({
      project: args.project,
      ref: args.ref,
      status: args.status,
      page: args.page,
      per_page: args.per_page,
    });
  },
};
