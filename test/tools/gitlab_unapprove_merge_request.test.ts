import { describe, expect, it, vi } from "vitest";

import { gitlabUnapproveMergeRequestTool } from "../../src/tools/gitlab_unapprove_merge_request.js";

describe("gitlab_unapprove_merge_request", () => {
  it("unapproves a merge request via facade", async () => {
    const unapproveMergeRequest = vi.fn(async () => ({ approved: false }));
    const ctx = { gitlab: { unapproveMergeRequest }, policy: { readOnly: false } } as any;

    const res = (await gitlabUnapproveMergeRequestTool.handler(
      { project: "group/project", iid: 7, sha: "abc" },
      ctx,
    )) as any;

    expect(unapproveMergeRequest).toHaveBeenCalledWith("group/project", 7, { sha: "abc" });
    expect(res.approved).toBe(false);
  });

  it("blocks in read-only mode", async () => {
    const unapproveMergeRequest = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { unapproveMergeRequest }, policy: { readOnly: true } } as any;

    await expect(
      gitlabUnapproveMergeRequestTool.handler({ project: "group/project", iid: 7 }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(unapproveMergeRequest).toHaveBeenCalledTimes(0);
  });
});

