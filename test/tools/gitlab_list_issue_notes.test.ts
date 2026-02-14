import { describe, expect, it, vi } from "vitest";

import { gitlabListIssueNotesTool } from "../../src/tools/gitlab_list_issue_notes.js";

describe("gitlab_list_issue_notes", () => {
  it("lists issue notes via facade", async () => {
    const listIssueNotes = vi.fn(async () => [{ id: 1, body: "hi", created_at: "now" }]);
    const ctx = { gitlab: { listIssueNotes }, policy: { readOnly: false } } as any;

    const res = (await gitlabListIssueNotesTool.handler(
      { project: "group/project", iid: 12, page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listIssueNotes).toHaveBeenCalledWith("group/project", 12, { page: 1, per_page: 20 });
    expect(res[0].id).toBe(1);
  });
});

