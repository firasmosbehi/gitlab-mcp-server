import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  ref: z.string().min(1).optional(),
});

export const gitlabGetLatestPipelineTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_latest_pipeline",
  description: "Get the latest pipeline for a project (optionally scoped to a ref).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      ref: { type: "string", description: "Optional branch/tag ref." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.getLatestPipeline(args.project, args.ref);
  },
};

