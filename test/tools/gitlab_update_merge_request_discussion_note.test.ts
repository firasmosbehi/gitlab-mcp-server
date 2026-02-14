import { describe, expect, it, vi } from "vitest";

import { gitlabUpdateMergeRequestDiscussionNoteTool } from "../../src/tools/gitlab_update_merge_request_discussion_note.js";

describe("gitlab_update_merge_request_discussion_note", () => {
  it("validates update fields", () => {
    expect(() =>
      gitlabUpdateMergeRequestDiscussionNoteTool.schema.parse({
        project: "p",
        iid: 1,
        discussion_id: "d",
        note_id: 2,
      }),
    ).toThrow(/at least one update field/i);
  });

  it("updates a discussion note via facade", async () => {
    const updateMergeRequestDiscussionNote = vi.fn(async () => ({ id: 1, body: "hi", created_at: "now" }));
    const ctx = { gitlab: { updateMergeRequestDiscussionNote }, policy: { readOnly: false } } as any;

    const res = (await gitlabUpdateMergeRequestDiscussionNoteTool.handler(
      { project: "group/project", iid: 7, discussion_id: "d", note_id: 2, resolved: true },
      ctx,
    )) as any;

    expect(updateMergeRequestDiscussionNote).toHaveBeenCalledWith("group/project", 7, "d", 2, {
      body: undefined,
      resolved: true,
    });
    expect(res.id).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const updateMergeRequestDiscussionNote = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { updateMergeRequestDiscussionNote }, policy: { readOnly: true } } as any;

    await expect(
      gitlabUpdateMergeRequestDiscussionNoteTool.handler(
        { project: "group/project", iid: 7, discussion_id: "d", note_id: 2, resolved: true },
        ctx,
      ),
    ).rejects.toThrow(/read-only/i);

    expect(updateMergeRequestDiscussionNote).toHaveBeenCalledTimes(0);
  });
});

