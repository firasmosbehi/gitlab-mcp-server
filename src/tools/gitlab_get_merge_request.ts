import { z } from "zod";

import { DEFAULT_MAX_DESCRIPTION_CHARS, truncateText } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().min(1),
});

export const gitlabGetMergeRequestTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_merge_request",
  description: "Fetch a single GitLab merge request by IID within a project.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const mr = await ctx.gitlab.getMergeRequest(args.project, args.iid);
    const t = truncateText(mr.description ?? "", DEFAULT_MAX_DESCRIPTION_CHARS);
    return {
      ...mr,
      description: t.text,
      description_truncated: t.truncated,
      description_original_length: t.original_length,
    };
  },
};

