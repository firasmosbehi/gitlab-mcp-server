import { describe, expect, it, vi } from "vitest";

import { gitlabMergeMergeRequestTool } from "../../src/tools/gitlab_merge_merge_request.js";

describe("gitlab_merge_merge_request", () => {
  it("merges a merge request via facade", async () => {
    const mergeMergeRequest = vi.fn(async () => ({ iid: 1, title: "t", state: "merged", web_url: "" }));
    const ctx = { gitlab: { mergeMergeRequest }, policy: { readOnly: false } } as any;

    const res = (await gitlabMergeMergeRequestTool.handler(
      { project: "group/project", iid: 7, squash: true, remove_source_branch: true },
      ctx,
    )) as any;

    expect(mergeMergeRequest).toHaveBeenCalledWith("group/project", 7, {
      sha: undefined,
      squash: true,
      removeSourceBranch: true,
      mergeWhenPipelineSucceeds: undefined,
      commitMessage: undefined,
    });
    expect(res.state).toBe("merged");
  });

  it("blocks in read-only mode", async () => {
    const mergeMergeRequest = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { mergeMergeRequest }, policy: { readOnly: true } } as any;

    await expect(
      gitlabMergeMergeRequestTool.handler({ project: "group/project", iid: 7 }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(mergeMergeRequest).toHaveBeenCalledTimes(0);
  });
});

