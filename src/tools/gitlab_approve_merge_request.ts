import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  sha: z.string().min(1).optional(),
});

export const gitlabApproveMergeRequestTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_approve_merge_request",
  description: "Approve a GitLab merge request (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      sha: { type: "string", description: "Optional commit SHA to ensure the MR didn't change." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.approveMergeRequest(args.project, args.iid, { sha: args.sha });
  },
};

