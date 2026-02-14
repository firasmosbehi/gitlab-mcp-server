import { z } from "zod";

import {
  DEFAULT_JOB_LOG_TAIL_MAX_BYTES,
  MAX_JOB_LOG_TAIL_MAX_BYTES_CAP,
} from "./common.js";
import type { ToolDef } from "./types.js";

const MAX_QUERY_CHARS = 200;
const MAX_CONTEXT_LINES_CAP = 50;
const MAX_MATCHES_CAP = 50;
const MAX_LINE_CHARS = 4000;

function truncateLine(s: string): string {
  if (s.length <= MAX_LINE_CHARS) return s;
  return `${s.slice(0, MAX_LINE_CHARS)}...[truncated_line original_length=${s.length}]`;
}

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
  query: z.string().min(1).max(MAX_QUERY_CHARS),
  case_insensitive: z.boolean().default(true),
  context_lines: z.number().int().min(0).max(MAX_CONTEXT_LINES_CAP).default(2),
  max_matches: z.number().int().min(1).max(MAX_MATCHES_CAP).default(10),
  max_bytes: z
    .number()
    .int()
    .min(1)
    .max(MAX_JOB_LOG_TAIL_MAX_BYTES_CAP)
    .default(DEFAULT_JOB_LOG_TAIL_MAX_BYTES),
});

export const gitlabSearchJobLogTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_search_job_log",
  description:
    "Search a GitLab CI job log tail for a substring and return matching lines with context (bounded).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "job_id", "query"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      job_id: { type: "number" },
      query: { type: "string", minLength: 1, maxLength: MAX_QUERY_CHARS },
      case_insensitive: { type: "boolean", default: true },
      context_lines: { type: "number", minimum: 0, maximum: MAX_CONTEXT_LINES_CAP, default: 2 },
      max_matches: { type: "number", minimum: 1, maximum: MAX_MATCHES_CAP, default: 10 },
      max_bytes: { type: "number", minimum: 1, maximum: MAX_JOB_LOG_TAIL_MAX_BYTES_CAP, default: DEFAULT_JOB_LOG_TAIL_MAX_BYTES },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const tail = await ctx.gitlab.getJobLogTail(args.project, args.job_id, args.max_bytes);
    const haystack = tail.text.replace(/\r\n/g, "\n");
    const lines = haystack.split("\n");

    const q = args.case_insensitive ? args.query.toLowerCase() : args.query;

    const matches: any[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      const candidate = args.case_insensitive ? line.toLowerCase() : line;
      if (!candidate.includes(q)) continue;

      const start = Math.max(0, i - args.context_lines);
      const end = Math.min(lines.length, i + args.context_lines + 1);

      matches.push({
        line_number_in_snippet: i + 1,
        line: truncateLine(line),
        context_before: lines.slice(start, i).map(truncateLine),
        context_after: lines.slice(i + 1, end).map(truncateLine),
      });

      if (matches.length >= args.max_matches) break;
    }

    return {
      job_id: args.job_id,
      query: args.query,
      case_insensitive: args.case_insensitive,
      context_lines: args.context_lines,
      max_matches: args.max_matches,
      searched_tail_bytes: args.max_bytes,
      is_partial: tail.is_partial,
      bytes_total: tail.bytes_total,
      bytes_start: tail.bytes_start,
      bytes_end: tail.bytes_end,
      matches_found: matches.length,
      matches,
    };
  },
};

