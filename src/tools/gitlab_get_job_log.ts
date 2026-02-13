import { z } from "zod";

import {
  DEFAULT_MAX_JOB_LOG_CHARS,
  MAX_JOB_LOG_CHARS_CAP,
  truncateText,
} from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
  max_chars: z.number().int().min(1).max(MAX_JOB_LOG_CHARS_CAP).default(DEFAULT_MAX_JOB_LOG_CHARS),
});

export const gitlabGetJobLogTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_job_log",
  description: "Fetch and return a GitLab CI job log (trace).",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "job_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      job_id: { type: "number" },
      max_chars: { type: "number", minimum: 1, maximum: MAX_JOB_LOG_CHARS_CAP, default: DEFAULT_MAX_JOB_LOG_CHARS },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const log = await ctx.gitlab.getJobLog(args.project, args.job_id);
    const t = truncateText(log, args.max_chars);
    return {
      job_id: args.job_id,
      log: t.text,
      log_truncated: t.truncated,
      log_original_length: t.original_length,
    };
  },
};

