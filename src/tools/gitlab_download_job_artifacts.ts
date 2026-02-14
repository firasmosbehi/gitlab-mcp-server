import { z } from "zod";

import { DEFAULT_MAX_ARTIFACT_BYTES, MAX_ARTIFACT_BYTES_CAP } from "./common.js";
import type { ToolDef } from "./types.js";

const Schema = z.object({
  project: z.string().min(1),
  job_id: z.number().int().min(1),
  max_bytes: z.number().int().min(1).max(MAX_ARTIFACT_BYTES_CAP).default(DEFAULT_MAX_ARTIFACT_BYTES),
});

export const gitlabDownloadJobArtifactsTool: ToolDef<typeof Schema, unknown> = {
  name: "gitlab_download_job_artifacts",
  description:
    "Download a job's artifacts archive to a local temp path (size-limited). Returns the local path.",
  access: "read",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["project", "job_id"],
    properties: {
      project: { type: "string", description: "Project ID or path (e.g. group/project)." },
      job_id: { type: "number" },
      max_bytes: { type: "number", minimum: 1, maximum: MAX_ARTIFACT_BYTES_CAP, default: DEFAULT_MAX_ARTIFACT_BYTES },
    },
  },
  schema: Schema,
  async handler(args, ctx) {
    return ctx.gitlab.downloadJobArtifacts(args.project, args.job_id, { maxBytes: args.max_bytes });
  },
};

