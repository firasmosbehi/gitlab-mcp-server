import { describe, expect, it, vi } from "vitest";

import { gitlabCreateMergeRequestDiscussionTool } from "../../src/tools/gitlab_create_merge_request_discussion.js";

describe("gitlab_create_merge_request_discussion", () => {
  it("creates a discussion via facade", async () => {
    const createMergeRequestDiscussion = vi.fn(async () => ({ id: "d", notes: [] }));
    const ctx = { gitlab: { createMergeRequestDiscussion }, policy: { readOnly: false } } as any;

    const res = (await gitlabCreateMergeRequestDiscussionTool.handler(
      {
        project: "group/project",
        iid: 7,
        body: "hello",
        position: {
          base_sha: "base",
          start_sha: "start",
          head_sha: "head",
          new_path: "src/a.ts",
          new_line: 10,
        },
      },
      ctx,
    )) as any;

    expect(createMergeRequestDiscussion).toHaveBeenCalledWith("group/project", 7, "hello", {
      position: {
        base_sha: "base",
        start_sha: "start",
        head_sha: "head",
        new_path: "src/a.ts",
        new_line: 10,
      },
    });
    expect(res.id).toBe("d");
  });

  it("blocks in read-only mode", async () => {
    const createMergeRequestDiscussion = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { createMergeRequestDiscussion }, policy: { readOnly: true } } as any;

    await expect(
      gitlabCreateMergeRequestDiscussionTool.handler(
        { project: "group/project", iid: 7, body: "hello" },
        ctx,
      ),
    ).rejects.toThrow(/read-only/i);

    expect(createMergeRequestDiscussion).toHaveBeenCalledTimes(0);
  });
});

