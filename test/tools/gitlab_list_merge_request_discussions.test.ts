import { describe, expect, it, vi } from "vitest";

import { gitlabListMergeRequestDiscussionsTool } from "../../src/tools/gitlab_list_merge_request_discussions.js";

describe("gitlab_list_merge_request_discussions", () => {
  it("lists discussions via facade", async () => {
    const listMergeRequestDiscussions = vi.fn(async () => [{ id: "d", notes: [] }]);
    const ctx = { gitlab: { listMergeRequestDiscussions }, policy: { readOnly: false } } as any;

    const res = (await gitlabListMergeRequestDiscussionsTool.handler(
      { project: "group/project", iid: 7, page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listMergeRequestDiscussions).toHaveBeenCalledWith("group/project", 7, { page: 1, per_page: 20 });
    expect(res[0].id).toBe("d");
  });
});

