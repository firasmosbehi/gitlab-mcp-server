import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({});

export const gitlabGetCurrentUserTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_current_user",
  description: "Get the currently authenticated GitLab user.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {},
  },
  schema: Schema,
  async handler(_args, ctx) {
    return ctx.gitlab.getCurrentUser();
  },
};

