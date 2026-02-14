import { describe, expect, it, vi } from "vitest";

import { gitlabListPipelineVariablesTool } from "../../src/tools/gitlab_list_pipeline_variables.js";

describe("gitlab_list_pipeline_variables", () => {
  it("lists pipeline variables via facade", async () => {
    const listPipelineVariables = vi.fn(async () => [{ key: "A", value: "1" }]);
    const ctx = { gitlab: { listPipelineVariables }, policy: { readOnly: false } } as any;

    const res = (await gitlabListPipelineVariablesTool.handler(
      { project: "group/project", pipeline_id: 10 },
      ctx,
    )) as any[];

    expect(listPipelineVariables).toHaveBeenCalledWith("group/project", 10);
    expect(res[0].key).toBe("A");
  });
});

