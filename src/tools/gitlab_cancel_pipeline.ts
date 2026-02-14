import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const Schema = z.object({
  project: z.string().min(1),
  pipeline_id: z.number().int().min(1),
});

export const gitlabCancelPipelineTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_cancel_pipeline",
  description: "Cancel a GitLab pipeline by pipeline ID.",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "pipeline_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      pipeline_id: { type: "number" },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.cancelPipeline(args.project, args.pipeline_id);
  },
};

