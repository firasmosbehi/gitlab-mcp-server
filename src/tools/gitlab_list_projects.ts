import { z } from "zod";

import { PageSchema, PerPageSchema } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  search: z.string().min(1).optional(),
  membership: z.boolean().default(true),
  page: PageSchema,
  per_page: PerPageSchema,
});

export const gitlabListProjectsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_list_projects",
  description: "List projects visible to the current user (supports search).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", description: "Optional search query." },
      membership: {
        type: "boolean",
        description: "If true, only list projects where the user is a member (default: true).",
        default: true,
      },
      page: { type: "number", minimum: 1, default: 1 },
      per_page: { type: "number", minimum: 1, maximum: 100, default: 20 },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.listProjects({
      search: args.search,
      membership: args.membership,
      page: args.page,
      per_page: args.per_page,
    });
  },
};

