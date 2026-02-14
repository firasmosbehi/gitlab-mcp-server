import { describe, expect, it, vi } from "vitest";

import { gitlabCreateMergeRequestTool } from "../../src/tools/gitlab_create_merge_request.js";

describe("gitlab_create_merge_request", () => {
  it("prefixes Draft: when draft=true", async () => {
    const createMergeRequest = vi.fn(async (..._args: any[]) => ({ iid: 1, web_url: "x", state: "opened" }));
    const ctx = { gitlab: { createMergeRequest }, policy: { readOnly: false } } as any;

    await gitlabCreateMergeRequestTool.handler(
      {
        project: "group/project",
        source_branch: "feature",
        title: "Add thing",
        draft: true,
      },
      ctx,
    );

    const call = createMergeRequest.mock.calls[0] as any[];
    const title = call[3];
    expect(title).toMatch(/^Draft:/);
  });

  it("blocks in read-only mode", async () => {
    const createMergeRequest = vi.fn(async (..._args: any[]) => ({ ok: true }));
    const ctx = { gitlab: { createMergeRequest }, policy: { readOnly: true } } as any;

    await expect(
      gitlabCreateMergeRequestTool.handler(
        { project: "group/project", source_branch: "feature", title: "t", draft: false },
        ctx,
      ),
    ).rejects.toThrow(/read-only/i);

    expect(createMergeRequest).toHaveBeenCalledTimes(0);
  });
});
