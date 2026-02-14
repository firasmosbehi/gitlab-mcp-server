import { describe, expect, it, vi } from "vitest";

import { gitlabDownloadJobArtifactsTool } from "../../src/tools/gitlab_download_job_artifacts.js";

describe("gitlab_download_job_artifacts", () => {
  it("passes max_bytes to facade", async () => {
    const downloadJobArtifacts = vi.fn(async () => ({
      job_id: 1,
      filename: "artifacts.zip",
      downloaded_bytes: 10,
      local_path: "/tmp/x",
    }));

    const ctx = { gitlab: { downloadJobArtifacts } } as any;

    const res = (await gitlabDownloadJobArtifactsTool.handler(
      { project: "group/project", job_id: 1, max_bytes: 123 },
      ctx,
    )) as any;

    expect(downloadJobArtifacts).toHaveBeenCalledWith("group/project", 1, { maxBytes: 123 });
    expect(res.local_path).toBe("/tmp/x");
  });
});

