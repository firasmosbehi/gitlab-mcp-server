import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  pipeline_id: z.number().int().positive(),
});

export const gitlabListPipelineVariablesTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_pipeline_variables",
  description: "List variables for a GitLab pipeline.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "pipeline_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      pipeline_id: { type: "number", description: "Pipeline ID." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listPipelineVariables(args.project, args.pipeline_id);
  },
};

