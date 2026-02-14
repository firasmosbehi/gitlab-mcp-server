import { z } from "zod";

import type { CommitActionInput } from "../gitlab/client.js";
import type { ToolDef } from "./types.js";
import { assertValidRepoFilePath } from "./path_validation.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_ACTIONS = 20;
const MAX_ACTION_CONTENT_CHARS = 200_000;
const MAX_TOTAL_CONTENT_CHARS = 500_000;
const MAX_ACTION_DECODED_BYTES = 200_000;

function hasNul(s: string): boolean {
  return s.includes("\u0000");
}

function isProbablyTextUtf8(buf: Buffer): boolean {
  if (buf.includes(0)) return false;
  const s = buf.toString("utf8");
  // Replacement char indicates invalid UTF-8 sequences.
  if (s.includes("\uFFFD")) return false;
  return true;
}

const EncodingSchema = z.enum(["text", "base64"]);

const BaseActionSchema = z.object({
  file_path: z.string().min(1),
  encoding: EncodingSchema.optional(),
  last_commit_id: z.string().min(1).optional(),
});

const CreateActionSchema = BaseActionSchema.extend({
  action: z.literal("create"),
  content: z.string().min(1),
});

const UpdateActionSchema = BaseActionSchema.extend({
  action: z.literal("update"),
  content: z.string().min(1),
});

const DeleteActionSchema = BaseActionSchema.extend({
  action: z.literal("delete"),
  content: z.string().optional(),
});

const ActionSchema = z.discriminatedUnion("action", [
  CreateActionSchema,
  UpdateActionSchema,
  DeleteActionSchema,
]);

const Schema = z.object({
  project: z.string().min(1),
  branch: z.string().min(1),
  commit_message: z.string().min(1),
  start_branch: z.string().min(1).optional(),
  actions: z.array(ActionSchema).min(1).max(MAX_ACTIONS),
});

export const gitlabCreateCommitTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_commit",
  description:
    "Create a commit with multiple file actions (create/update/delete) on a branch (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "branch", "commit_message", "actions"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      branch: { type: "string", description: "Target branch name." },
      commit_message: { type: "string", description: "Commit message." },
      start_branch: {
        type: "string",
        description:
          "Optional start branch; if set, GitLab can create the branch and apply the commit.",
      },
      actions: {
        type: "array",
        minItems: 1,
        maxItems: MAX_ACTIONS,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["action", "file_path"],
          properties: {
            action: { type: "string", enum: ["create", "update", "delete"] },
            file_path: { type: "string" },
            content: { type: "string" },
            encoding: { type: "string", enum: ["text", "base64"] },
            last_commit_id: { type: "string" },
          },
        },
      },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);

    let totalChars = 0;
    const mapped: CommitActionInput[] = args.actions.map((a) => {
      assertValidRepoFilePath(a.file_path);

      const encoding = a.encoding ?? "text";
      if (a.content) {
        if (a.content.length > MAX_ACTION_CONTENT_CHARS) {
          throw new Error(
            `Action content too large for '${a.file_path}' (max ${MAX_ACTION_CONTENT_CHARS} chars).`,
          );
        }
        totalChars += a.content.length;
      }

      if (a.content && hasNul(a.content)) {
        throw new Error(`Content for '${a.file_path}' must not contain NUL bytes.`);
      }

      if (a.content && encoding === "base64") {
        const buf = Buffer.from(a.content, "base64");
        if (buf.length > MAX_ACTION_DECODED_BYTES) {
          throw new Error(
            `Base64 content too large for '${a.file_path}' (max ${MAX_ACTION_DECODED_BYTES} bytes decoded).`,
          );
        }
        if (!isProbablyTextUtf8(buf)) {
          throw new Error(
            `Base64 content for '${a.file_path}' does not look like valid UTF-8 text (binary commits are blocked by default).`,
          );
        }
      }

      const out: CommitActionInput = {
        action: a.action,
        filePath: a.file_path,
        content: a.action === "delete" ? undefined : a.content,
        encoding: encoding === "base64" ? "base64" : "text",
        lastCommitId: a.last_commit_id,
      };

      // GitLab defaults to text when encoding is omitted; keep payload minimal.
      if (out.encoding === "text") delete (out as any).encoding;

      return out;
    });

    if (totalChars > MAX_TOTAL_CONTENT_CHARS) {
      throw new Error(`Total action content too large (max ${MAX_TOTAL_CONTENT_CHARS} chars).`);
    }

    return ctx.gitlab.createCommit(args.project, args.branch, args.commit_message, mapped, {
      startBranch: args.start_branch,
    });
  },
};
