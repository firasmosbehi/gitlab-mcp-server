import { z } from "zod";

import { PageSchema, PerPageSchema, truncateText } from "./common.js";
import type { ToolDef } from "./types.js";

const MAX_SNIPPET_CHARS_DEFAULT = 1000;
const MAX_SNIPPET_CHARS_CAP = 10_000;

const Schema = z.object({
  project: z.string().min(1),
  query: z.string().min(1),
  ref: z.string().min(1).optional(),
  page: PageSchema,
  per_page: PerPageSchema,
  max_snippet_chars: z
    .number()
    .int()
    .min(50)
    .max(MAX_SNIPPET_CHARS_CAP)
    .default(MAX_SNIPPET_CHARS_DEFAULT),
});

export const gitlabSearchCodeTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_search_code",
  description: "Search code within a GitLab project (scope=blobs).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "query"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      query: { type: "string", description: "Search query." },
      ref: { type: "string", description: "Optional ref to search within." },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
      max_snippet_chars: { type: "number", minimum: 50, maximum: MAX_SNIPPET_CHARS_CAP, default: MAX_SNIPPET_CHARS_DEFAULT },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const matches = await ctx.gitlab.searchCode({
      project: args.project,
      query: args.query,
      ref: args.ref,
      page: args.page,
      per_page: args.per_page,
    });

    return matches.map((m) => {
      const snippet = truncateText(m.data ?? "", args.max_snippet_chars);
      return {
        path: m.path,
        filename: m.filename,
        ref: m.ref,
        startline: m.startline,
        snippet: snippet.text,
        snippet_truncated: snippet.truncated,
        snippet_original_length: snippet.original_length,
      };
    });
  },
};

