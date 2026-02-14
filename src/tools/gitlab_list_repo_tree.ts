import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  ref: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  recursive: z.boolean().optional().default(false),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListRepoTreeTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_repo_tree",
  description: "List repository files and directories for a GitLab project at a ref/path.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      ref: { type: "string", description: "Ref (branch/tag/sha). Defaults to project default branch." },
      path: { type: "string", description: "Repository-relative directory path. Defaults to root." },
      recursive: { type: "boolean", default: false },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listRepoTree({
      project: args.project,
      ref: args.ref,
      path: args.path,
      recursive: args.recursive,
      page: args.page,
      per_page: args.per_page,
    });
  },
};

