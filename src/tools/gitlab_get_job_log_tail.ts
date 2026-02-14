import { z } from "zod";

import {
  DEFAULT_JOB_LOG_TAIL_LINES,
  DEFAULT_JOB_LOG_TAIL_MAX_BYTES,
  MAX_JOB_LOG_TAIL_MAX_BYTES_CAP,
} from "./common.js";
import type { ToolDef } from "./types.js";

const MAX_TAIL_LINES_CAP = 5000;

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
  lines: z.number().int().min(1).max(MAX_TAIL_LINES_CAP).default(DEFAULT_JOB_LOG_TAIL_LINES),
  max_bytes: z
    .number()
    .int()
    .min(1)
    .max(MAX_JOB_LOG_TAIL_MAX_BYTES_CAP)
    .default(DEFAULT_JOB_LOG_TAIL_MAX_BYTES),
});

export const gitlabGetJobLogTailTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_job_log_tail",
  description: "Fetch the tail (last N lines) of a GitLab CI job log with bounded bytes.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "job_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      job_id: { type: "number" },
      lines: { type: "number", minimum: 1, maximum: MAX_TAIL_LINES_CAP, default: DEFAULT_JOB_LOG_TAIL_LINES },
      max_bytes: { type: "number", minimum: 1, maximum: MAX_JOB_LOG_TAIL_MAX_BYTES_CAP, default: DEFAULT_JOB_LOG_TAIL_MAX_BYTES },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const tail = await ctx.gitlab.getJobLogTail(args.project, args.job_id, args.max_bytes);
    const all = tail.text.replace(/\r\n/g, "\n").split("\n");
    if (all.length && all[all.length - 1] === "") all.pop();
    const out = all.slice(Math.max(0, all.length - args.lines));

    return {
      job_id: args.job_id,
      lines_requested: args.lines,
      lines_returned: out.length,
      max_bytes: args.max_bytes,
      is_partial: tail.is_partial,
      bytes_total: tail.bytes_total,
      bytes_start: tail.bytes_start,
      bytes_end: tail.bytes_end,
      log_tail: out.join("\n"),
    };
  },
};
