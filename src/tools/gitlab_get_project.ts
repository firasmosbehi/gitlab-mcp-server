import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
});

export const gitlabGetProjectTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_project",
  description: "Get project details (id/path, default branch, web URL).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.getProject(args.project);
  },
};

