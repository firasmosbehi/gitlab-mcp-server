import { z } from "zod";

import { DEFAULT_MAX_DESCRIPTION_CHARS, truncateText } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().min(1),
});

export const gitlabGetIssueTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_issue",
  description: "Fetch a single GitLab issue by IID within a project.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Issue IID (project-scoped)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    const issue = await ctx.gitlab.getIssue(args.project, args.iid);
    const t = truncateText(issue.description ?? "", DEFAULT_MAX_DESCRIPTION_CHARS);
    return {
      ...issue,
      description: t.text,
      description_truncated: t.truncated,
      description_original_length: t.original_length,
    };
  },
};

