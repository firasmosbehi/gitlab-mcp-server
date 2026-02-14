import { describe, expect, it, vi } from "vitest";

import { gitlabGetProjectTool } from "../../src/tools/gitlab_get_project.js";

describe("gitlab_get_project", () => {
  it("gets project via facade", async () => {
    const getProject = vi.fn(async () => ({ id: 1, name: "p", path_with_namespace: "g/p", web_url: "" }));
    const ctx = { gitlab: { getProject }, policy: { readOnly: false } } as any;

    const res = (await gitlabGetProjectTool.handler({ project: "group/project" }, ctx)) as any;

    expect(getProject).toHaveBeenCalledWith("group/project");
    expect(res.id).toBe(1);
  });
});

