import { z } from "zod";

import type { ToolDef } from "./types.js";
import { assertWriteAllowed } from "./write_guard.js";

const MAX_VARIABLES = 50;

const VariableSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const Schema = z.object({
  project: z.string().min(1),
  ref: z.string().min(1),
  token: z.string().min(1).optional(),
  variables: z.array(VariableSchema).max(MAX_VARIABLES).optional(),
});

export const gitlabTriggerPipelineTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_trigger_pipeline",
  description:
    "Trigger a pipeline using a GitLab trigger token (preferred via GITLAB_TRIGGER_TOKEN; API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "ref"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      ref: { type: "string", description: "Branch/tag ref to run the pipeline on." },
      token: {
        type: "string",
        description:
          "Optional trigger token override. Prefer setting GITLAB_TRIGGER_TOKEN in the server environment.",
      },
      variables: {
        type: "array",
        description: "Optional pipeline variables.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "value"],
          properties: {
            key: { type: "string" },
            value: { type: "string" },
          },
        },
      },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    assertWriteAllowed(ctx, args.project);
    return ctx.gitlab.triggerPipeline(args.project, args.ref, {
      token: args.token,
      variables: args.variables,
    });
  },
};

