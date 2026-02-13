import { z } from "zod";

import { DEFAULT_MAX_FILE_CHARS, truncateText } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  file_path: z.string().min(1),
  ref: z.string().min(1).optional(),
});

export const gitlabGetFileTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_file",
  description: "Read a file from a GitLab repository at a given ref (branch/tag/sha).",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "file_path"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      file_path: { type: "string", description: "File path in the repository." },
      ref: { type: "string", description: "Ref name (branch/tag/sha). Defaults to project default branch." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const file = await ctx.gitlab.getFile(args.project, args.file_path, args.ref);
    const t = truncateText(file.content, DEFAULT_MAX_FILE_CHARS);
    return {
      file_path: file.file_path,
      ref: file.ref,
      content: t.text,
      size_bytes: file.size_bytes,
      content_truncated: t.truncated,
      content_original_length: t.original_length,
    };
  },
};

