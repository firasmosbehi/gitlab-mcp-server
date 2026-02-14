import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
});

export const gitlabGetJobArtifactsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_job_artifacts",
  description: "Fetch CI job artifacts metadata (filename/size/format) for a job.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "job_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      job_id: { type: "number" },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.getJobArtifactsMetadata(args.project, args.job_id);
  },
};

