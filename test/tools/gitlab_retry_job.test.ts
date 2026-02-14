import { describe, expect, it, vi } from "vitest";

import { gitlabRetryJobTool } from "../../src/tools/gitlab_retry_job.js";

describe("gitlab_retry_job", () => {
  it("retries a job via facade", async () => {
    const retryJob = vi.fn(async () => ({ id: 1, status: "running", web_url: "" }));
    const ctx = { gitlab: { retryJob }, policy: { readOnly: false } } as any;

    const res = (await gitlabRetryJobTool.handler(
      { project: "group/project", job_id: 1 },
      ctx,
    )) as any;

    expect(res.id).toBe(1);
    expect(retryJob).toHaveBeenCalledWith("group/project", 1);
  });

  it("blocks in read-only mode", async () => {
    const retryJob = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { retryJob }, policy: { readOnly: true } } as any;

    await expect(
      gitlabRetryJobTool.handler({ project: "group/project", job_id: 1 }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(retryJob).toHaveBeenCalledTimes(0);
  });
});

