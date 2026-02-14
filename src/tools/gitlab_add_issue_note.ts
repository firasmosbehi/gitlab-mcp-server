import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_NOTE_BODY_CHARS = 50_000;

const Schema = z.object({
  project: z.string().min(1),
  iid: z.number().int().positive(),
  body: z.string().min(1).max(MAX_NOTE_BODY_CHARS),
});

export const gitlabAddIssueNoteTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_add_issue_note",
  description: "Add a note (comment) to a GitLab issue.",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "iid", "body"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      iid: { type: "number", description: "Issue IID (project-scoped)." },
      body: { type: "string", description: "Note body (markdown supported)." },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.addIssueNote(args.project, args.iid, args.body);
  },
};

