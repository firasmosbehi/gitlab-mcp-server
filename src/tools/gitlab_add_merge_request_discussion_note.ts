import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_BODY_CHARS = 50_000;

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  discussion_id: z.string().min(1),
  body: z.string().min(1).max(MAX_BODY_CHARS),
});

export const gitlabAddMergeRequestDiscussionNoteTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_add_merge_request_discussion_note",
  description: "Reply to a merge request discussion (thread) by adding a note.",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid", "discussion_id", "body"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Merge request IID (project-scoped)." },
      discussion_id: { type: "string", description: "Discussion ID." },
      body: { type: "string", description: "Reply body (markdown supported)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.addMergeRequestDiscussionNote(args.project, args.iid, args.discussion_id, args.body);
  },
};

