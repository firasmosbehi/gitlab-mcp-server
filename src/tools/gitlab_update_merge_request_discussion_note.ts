import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_BODY_CHARS = 50_000;

const Schema = z
  .object({
    project: z.string().min(1),
    iid: z.number().int().positive(),
    discussion_id: z.string().min(1),
    note_id: z.number().int().positive(),
    body: z.string().min(1).max(MAX_BODY_CHARS).optional(),
    resolved: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.body === undefined && v.resolved === undefined) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one update field must be provided ('body' or 'resolved').",
      });
    }
  });

export const gitlabUpdateMergeRequestDiscussionNoteTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_update_merge_request_discussion_note",
  description: "Update a merge request discussion note (edit body and/or resolve/unresolve).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid", "discussion_id", "note_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      discussion_id: { type: "string", description: "Discussion ID." },
      note_id: { type: "number", description: "Note ID." },
      body: { type: "string", description: "Updated note body (markdown supported)." },
      resolved: { type: "boolean", description: "Mark note resolved/unresolved (if resolvable)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.updateMergeRequestDiscussionNote(
      args.project,
      args.iid,
      args.discussion_id,
      args.note_id,
      { body: args.body, resolved: args.resolved },
    );
  },
};

