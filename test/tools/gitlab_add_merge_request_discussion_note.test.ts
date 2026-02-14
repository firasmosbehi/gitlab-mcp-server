import { describe, expect, it, vi } from "vitest";

import { gitlabAddMergeRequestDiscussionNoteTool } from "../../src/tools/gitlab_add_merge_request_discussion_note.js";

describe("gitlab_add_merge_request_discussion_note", () => {
  it("adds a discussion note via facade", async () => {
    const addMergeRequestDiscussionNote = vi.fn(async () => ({ id: 1, body: "hi", created_at: "now" }));
    const ctx = { gitlab: { addMergeRequestDiscussionNote }, policy: { readOnly: false } } as any;

    const res = (await gitlabAddMergeRequestDiscussionNoteTool.handler(
      { project: "group/project", iid: 7, discussion_id: "d", body: "hello" },
      ctx,
    )) as any;

    expect(addMergeRequestDiscussionNote).toHaveBeenCalledWith("group/project", 7, "d", "hello");
    expect(res.id).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const addMergeRequestDiscussionNote = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { addMergeRequestDiscussionNote }, policy: { readOnly: true } } as any;

    await expect(
      gitlabAddMergeRequestDiscussionNoteTool.handler(
        { project: "group/project", iid: 7, discussion_id: "d", body: "hello" },
        ctx,
      ),
    ).rejects.toThrow(/read-only/i);

    expect(addMergeRequestDiscussionNote).toHaveBeenCalledTimes(0);
  });
});

