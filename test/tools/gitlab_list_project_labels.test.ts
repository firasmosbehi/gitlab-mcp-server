import { describe, expect, it, vi } from "vitest";

import { gitlabListProjectLabelsTool } from "../../src/tools/gitlab_list_project_labels.js";

describe("gitlab_list_project_labels", () => {
  it("lists labels via facade", async () => {
    const listProjectLabels = vi.fn(async () => [{ id: 1, name: "bug" }]);
    const ctx = { gitlab: { listProjectLabels }, policy: { readOnly: false } } as any;

    const res = (await gitlabListProjectLabelsTool.handler(
      { project: "group/project", search: "b", page: 1, per_page: 20 },
      ctx,
    )) as any[];

    expect(listProjectLabels).toHaveBeenCalledWith({
      project: "group/project",
      search: "b",
      page: 1,
      per_page: 20,
    });
    expect(res[0].name).toBe("bug");
  });
});

