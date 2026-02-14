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
  variables: z.array(VariableSchema).max(MAX_VARIABLES).optional(),
});

export const gitlabCreatePipelineTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_create_pipeline",
  description: "Create a CI/CD pipeline for a ref (branch/tag) in a GitLab project (API-only).",
  access: "write",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "ref"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      ref: { type: "string", description: "Branch/tag ref to run the pipeline on." },
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
    return ctx.gitlab.createPipeline(args.project, args.ref, { variables: args.variables });
  },
};

