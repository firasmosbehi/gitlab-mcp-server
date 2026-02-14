import { describe, expect, it, vi } from "vitest";

import { gitlabAddMergeRequestNoteTool } from "../../src/tools/gitlab_add_merge_request_note.js";

describe("gitlab_add_merge_request_note", () => {
  it("adds a merge request note via facade", async () => {
    const addMergeRequestNote = vi.fn(async () => ({ id: 1, body: "hi", created_at: "now" }));
    const ctx = { gitlab: { addMergeRequestNote }, policy: { readOnly: false } } as any;

    const res = (await gitlabAddMergeRequestNoteTool.handler(
      { project: "group/project", iid: 7, body: "hello" },
      ctx,
    )) as any;

    expect(addMergeRequestNote).toHaveBeenCalledWith("group/project", 7, "hello");
    expect(res.id).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const addMergeRequestNote = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { addMergeRequestNote }, policy: { readOnly: true } } as any;

    await expect(
      gitlabAddMergeRequestNoteTool.handler({ project: "group/project", iid: 7, body: "hello" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(addMergeRequestNote).toHaveBeenCalledTimes(0);
  });
});

