import { z } from "zod";

import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  pipeline_id: z.number().int().positive(),
  include_suites: z.boolean().default(false),
  max_suites: z.number().int().min(1).max(200).default(20),
});

export const gitlabGetPipelineTestReportSummaryTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_get_pipeline_test_report_summary",
  description:
    "Get the pipeline test report summary (optionally include per-suite aggregates, without test cases).",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "pipeline_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      pipeline_id: { type: "number", description: "Pipeline ID." },
      include_suites: {
        type: "boolean",
        description: "Include per-suite aggregates (test cases are always omitted).",
        default: false,
      },
      max_suites: {
        type: "number",
        description: "Max number of suites to return when include_suites=true.",
        minimum: 1,
        maximum: 200,
        default: 20,
      },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.getPipelineTestReportSummary(args.project, args.pipeline_id, {
      includeSuites: args.include_suites,
      maxSuites: args.max_suites,
    });
  },
};

