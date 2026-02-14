import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const Schema = z.object({
  project: z.string().min(1),
  branch: z.string().min(1),
  ref: z.string().min(1).optional(),
});

export const gitlabCreateBranchTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_branch",
  description: "Create a branch in a GitLab project (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "branch"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      branch: { type: "string", description: "New branch name." },
      ref: { type: "string", description: "Source ref (branch/tag/sha). Defaults to default branch." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.createBranch(args.project, args.branch, args.ref);
  },
};

