import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertValidRepoFilePath } from "./path_validation.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_BODY_CHARS = 50_000;

const PositionSchema = z
  .object({
    base_sha: z.string().min(1),
    start_sha: z.string().min(1),
    head_sha: z.string().min(1),
    new_path: z.string().min(1).optional(),
    new_line: z.number().int().positive().optional(),
    old_path: z.string().min(1).optional(),
    old_line: z.number().int().positive().optional(),
  })
  .superRefine((v, ctx) => {
    const hasNew = v.new_path !== undefined || v.new_line !== undefined;
    const hasOld = v.old_path !== undefined || v.old_line !== undefined;

    if (hasNew && (!v.new_path || v.new_line === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["position"],
        message: "If providing new position, both 'new_path' and 'new_line' are required.",
      });
    }

    if (hasOld && (!v.old_path || v.old_line === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["position"],
        message: "If providing old position, both 'old_path' and 'old_line' are required.",
      });
    }

    if (!hasNew && !hasOld) {
      ctx.addIssue({
        code: "custom",
        path: ["position"],
        message:
          "Position must include either 'new_path'/'new_line' or 'old_path'/'old_line' (or both).",
      });
    }
  });

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  body: z.string().min(1).max(MAX_BODY_CHARS),
  position: PositionSchema.optional(),
});

export const gitlabCreateMergeRequestDiscussionTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_merge_request_discussion",
  description:
    "Create a merge request discussion (thread). Optionally supports inline diff positions (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid", "body"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      body: { type: "string", description: "Discussion note body (markdown supported)." },
      position: {
        type: "object",
        additionalProperties: false,
        required: ["base_sha", "start_sha", "head_sha"],
        properties: {
          base_sha: { type: "string" },
          start_sha: { type: "string" },
          head_sha: { type: "string" },
          new_path: { type: "string" },
          new_line: { type: "number" },
          old_path: { type: "string" },
          old_line: { type: "number" },
        },
      },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);

    if (args.position?.new_path) assertValidRepoFilePath(args.position.new_path);
    if (args.position?.old_path) assertValidRepoFilePath(args.position.old_path);

    return ctx.gitlab.createMergeRequestDiscussion(args.project, args.iid, args.body, {
      position: args.position,
    });
  },
};

