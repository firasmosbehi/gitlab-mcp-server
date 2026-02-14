import { z } from "zod";

import { truncateText } from "./common.js";
import type { ToolDef } from "./types.js";

const DEFAULT_MAX_FILES = 50;
const MAX_FILES_CAP = 200;

const DEFAULT_MAX_DIFF_CHARS_PER_FILE = 10_000;
const MAX_DIFF_CHARS_PER_FILE_CAP = 100_000;

const DEFAULT_MAX_TOTAL_DIFF_CHARS = 50_000;
const MAX_TOTAL_DIFF_CHARS_CAP = 500_000;

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().min(1),
  max_files: z.number().int().min(1).max(MAX_FILES_CAP).default(DEFAULT_MAX_FILES),
  max_diff_chars_per_file: z
    .number()
    .int()
    .min(100)
    .max(MAX_DIFF_CHARS_PER_FILE_CAP)
    .default(DEFAULT_MAX_DIFF_CHARS_PER_FILE),
  max_total_diff_chars: z
    .number()
    .int()
    .min(100)
    .max(MAX_TOTAL_DIFF_CHARS_CAP)
    .default(DEFAULT_MAX_TOTAL_DIFF_CHARS),
});

export const gitlabGetMergeRequestChangesTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_merge_request_changes",
  description: "Fetch merge request file changes and bounded diff snippets.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      max_files: { type: "number", minimum: 1, maximum: MAX_FILES_CAP, default: DEFAULT_MAX_FILES },
      max_diff_chars_per_file: { type: "number", minimum: 100, maximum: MAX_DIFF_CHARS_PER_FILE_CAP, default: DEFAULT_MAX_DIFF_CHARS_PER_FILE },
      max_total_diff_chars: { type: "number", minimum: 100, maximum: MAX_TOTAL_DIFF_CHARS_CAP, default: DEFAULT_MAX_TOTAL_DIFF_CHARS },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const mr = await ctx.gitlab.getMergeRequestChanges(args.project, args.iid);
    const changes: any[] = Array.isArray(mr?.changes) ? mr.changes : [];

    let remaining = args.max_total_diff_chars;
    const out: any[] = [];
    let anyTruncated = false;

    for (const c of changes.slice(0, args.max_files)) {
      const diff = typeof c?.diff === "string" ? c.diff : "";
      const allow = Math.max(0, Math.min(args.max_diff_chars_per_file, remaining));

      const t = truncateText(diff, allow);
      if (t.truncated) anyTruncated = true;

      out.push({
        old_path: c?.old_path,
        new_path: c?.new_path,
        new_file: c?.new_file,
        renamed_file: c?.renamed_file,
        deleted_file: c?.deleted_file,
        diff: t.text,
        diff_truncated: t.truncated,
        diff_original_length: t.original_length,
      });

      remaining -= Math.min(diff.length, allow);
      if (remaining <= 0) break;
    }

    return {
      iid: mr?.iid ?? args.iid,
      web_url: mr?.web_url,
      changes_total: changes.length,
      changes_returned: out.length,
      diffs_truncated: anyTruncated || out.length < Math.min(changes.length, args.max_files),
      changes: out,
    };
  },
};

