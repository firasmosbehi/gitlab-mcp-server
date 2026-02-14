import { describe, expect, it, vi } from "vitest";

import { gitlabListProjectsTool } from "../../src/tools/gitlab_list_projects.js";

describe("gitlab_list_projects", () => {
  it("defaults membership=true in schema", () => {
    const parsed = gitlabListProjectsTool.schema.parse({});
    expect(parsed.membership).toBe(true);
  });

  it("lists projects via facade", async () => {
    const listProjects = vi.fn(async () => [{ id: 1, name: "p", path_with_namespace: "g/p", web_url: "" }]);
    const ctx = { gitlab: { listProjects }, policy: { readOnly: false } } as any;

    const res = (await gitlabListProjectsTool.handler(
      { search: "git", membership: true, page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listProjects).toHaveBeenCalledWith({ search: "git", membership: true, page: 1, per_page: 20 });
    expect(res[0].id).toBe(1);
  });
});

