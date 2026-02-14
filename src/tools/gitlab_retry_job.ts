import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
});

export const gitlabRetryJobTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_retry_job",
  description: "Retry a GitLab CI job by job ID.",
  access: "write",
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
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.retryJob(args.project, args.job_id);
  },
};

