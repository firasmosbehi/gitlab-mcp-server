import { describe, expect, it, vi } from "vitest";

import { gitlabListTagsTool } from "../../src/tools/gitlab_list_tags.js";

describe("gitlab_list_tags", () => {
  it("lists tags via facade", async () => {
    const listTags = vi.fn(async () => [{ name: "v1.0.0" }]);
    const ctx = { gitlab: { listTags }, policy: { readOnly: false } } as any;

    const res = (await gitlabListTagsTool.handler(
      { project: "group/project", search: "v1", page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listTags).toHaveBeenCalledWith({
      project: "group/project",
      search: "v1",
      page: 1,
      per_page: 20,
    });
    expect(res[0].name).toBe("v1.0.0");
  });
});

