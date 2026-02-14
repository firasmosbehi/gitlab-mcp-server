import { describe, expect, it, vi } from "vitest";

import { gitlabListMergeRequestNotesTool } from "../../src/tools/gitlab_list_merge_request_notes.js";

describe("gitlab_list_merge_request_notes", () => {
  it("lists merge request notes via facade", async () => {
    const listMergeRequestNotes = vi.fn(async () => [{ id: 1, body: "hi", created_at: "now" }]);
    const ctx = { gitlab: { listMergeRequestNotes }, policy: { readOnly: false } } as any;

    const res = (await gitlabListMergeRequestNotesTool.handler(
      { project: "group/project", iid: 7, page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listMergeRequestNotes).toHaveBeenCalledWith("group/project", 7, { page: 1, per_page: 20 });
    expect(res[0].id).toBe(1);
  });
});

