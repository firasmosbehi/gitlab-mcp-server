import { describe, expect, it, vi } from "vitest";

import { gitlabCreateBranchTool } from "../../src/tools/gitlab_create_branch.js";

describe("gitlab_create_branch", () => {
  it("creates a branch via facade", async () => {
    const createBranch = vi.fn(async () => ({ name: "feature", commit_sha: "abc", web_url: "" }));
    const ctx = { gitlab: { createBranch }, policy: { readOnly: false } } as any;

    const res = (await gitlabCreateBranchTool.handler(
      { project: "group/project", branch: "feature", ref: "main" },
      ctx,
    )) as any;

    expect(res.name).toBe("feature");
    expect(createBranch).toHaveBeenCalledWith("group/project", "feature", "main");
  });

  it("blocks in read-only mode", async () => {
    const createBranch = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { createBranch }, policy: { readOnly: true } } as any;

    await expect(
      gitlabCreateBranchTool.handler({ project: "group/project", branch: "feature" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(createBranch).toHaveBeenCalledTimes(0);
  });
});

