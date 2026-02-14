import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_COMMIT_MESSAGE_CHARS = 10_000;

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  sha: z.string().min(1).optional(),
  squash: z.boolean().optional(),
  remove_source_branch: z.boolean().optional(),
  merge_when_pipeline_succeeds: z.boolean().optional(),
  commit_message: z.string().min(1).max(MAX_COMMIT_MESSAGE_CHARS).optional(),
});

export const gitlabMergeMergeRequestTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_merge_merge_request",
  description: "Merge (accept) a GitLab merge request (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      sha: { type: "string", description: "Optional commit SHA to ensure the MR didn't change." },
      squash: { type: "boolean", description: "If true, squash commits when merging." },
      remove_source_branch: {
        type: "boolean",
        description: "If true, remove source branch when merge succeeds.",
      },
      merge_when_pipeline_succeeds: {
        type: "boolean",
        description: "If true, set MR to merge when pipeline succeeds.",
      },
      commit_message: { type: "string", description: "Optional merge commit message override." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.mergeMergeRequest(args.project, args.iid, {
      sha: args.sha,
      squash: args.squash,
      removeSourceBranch: args.remove_source_branch,
      mergeWhenPipelineSucceeds: args.merge_when_pipeline_succeeds,
      commitMessage: args.commit_message,
    });
  },
};

