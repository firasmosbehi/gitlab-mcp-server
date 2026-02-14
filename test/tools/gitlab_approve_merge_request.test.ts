import { describe, expect, it, vi } from "vitest";

import { gitlabApproveMergeRequestTool } from "../../src/tools/gitlab_approve_merge_request.js";

describe("gitlab_approve_merge_request", () => {
  it("approves a merge request via facade", async () => {
    const approveMergeRequest = vi.fn(async () => ({ approved: true }));
    const ctx = { gitlab: { approveMergeRequest }, policy: { readOnly: false } } as any;

    const res = (await gitlabApproveMergeRequestTool.handler(
      { project: "group/project", iid: 7, sha: "abc" },
      ctx,
    )) as any;

    expect(approveMergeRequest).toHaveBeenCalledWith("group/project", 7, { sha: "abc" });
    expect(res.approved).toBe(true);
  });

  it("blocks in read-only mode", async () => {
    const approveMergeRequest = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { approveMergeRequest }, policy: { readOnly: true } } as any;

    await expect(
      gitlabApproveMergeRequestTool.handler({ project: "group/project", iid: 7 }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(approveMergeRequest).toHaveBeenCalledTimes(0);
  });
});

