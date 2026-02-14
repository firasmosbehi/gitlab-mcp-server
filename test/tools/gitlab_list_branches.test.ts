import { describe, expect, it, vi } from "vitest";

import { gitlabListBranchesTool } from "../../src/tools/gitlab_list_branches.js";

describe("gitlab_list_branches", () => {
  it("lists branches via facade", async () => {
    const listBranches = vi.fn(async () => [{ name: "main" }]);
    const ctx = { gitlab: { listBranches }, policy: { readOnly: false } } as any;

    const res = (await gitlabListBranchesTool.handler(
      { project: "group/project", search: "ma", page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listBranches).toHaveBeenCalledWith({
      project: "group/project",
      search: "ma",
      page: 1,
      per_page: 20,
    });
    expect(res[0].name).toBe("main");
  });
});

