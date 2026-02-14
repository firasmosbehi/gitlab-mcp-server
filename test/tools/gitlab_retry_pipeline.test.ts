import { describe, expect, it, vi } from "vitest";

import { gitlabRetryPipelineTool } from "../../src/tools/gitlab_retry_pipeline.js";

describe("gitlab_retry_pipeline", () => {
  it("retries a pipeline via facade", async () => {
    const retryPipeline = vi.fn(async () => ({ id: 10, status: "running", ref: "main", sha: "abc" }));
    const ctx = { gitlab: { retryPipeline }, policy: { readOnly: false } } as any;

    const res = (await gitlabRetryPipelineTool.handler(
      { project: "group/project", pipeline_id: 10 },
      ctx,
    )) as any;

    expect(res.id).toBe(10);
    expect(retryPipeline).toHaveBeenCalledWith("group/project", 10);
  });

  it("blocks in read-only mode", async () => {
    const retryPipeline = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { retryPipeline }, policy: { readOnly: true } } as any;

    await expect(
      gitlabRetryPipelineTool.handler({ project: "group/project", pipeline_id: 10 }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(retryPipeline).toHaveBeenCalledTimes(0);
  });
});

