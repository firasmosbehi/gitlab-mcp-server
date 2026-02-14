import { describe, expect, it, vi } from "vitest";

import { gitlabAddIssueNoteTool } from "../../src/tools/gitlab_add_issue_note.js";

describe("gitlab_add_issue_note", () => {
  it("adds an issue note via facade", async () => {
    const addIssueNote = vi.fn(async () => ({ id: 1, body: "hi", created_at: "now" }));
    const ctx = { gitlab: { addIssueNote }, policy: { readOnly: false } } as any;

    const res = (await gitlabAddIssueNoteTool.handler(
      { project: "group/project", iid: 12, body: "hello" },
      ctx,
    )) as any;

    expect(addIssueNote).toHaveBeenCalledWith("group/project", 12, "hello");
    expect(res.id).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const addIssueNote = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { addIssueNote }, policy: { readOnly: true } } as any;

    await expect(
      gitlabAddIssueNoteTool.handler({ project: "group/project", iid: 12, body: "hello" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(addIssueNote).toHaveBeenCalledTimes(0);
  });
});

