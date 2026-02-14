import { describe, expect, it, vi } from "vitest";

import { gitlabGetLatestPipelineTool } from "../../src/tools/gitlab_get_latest_pipeline.js";

describe("gitlab_get_latest_pipeline", () => {
  it("gets latest pipeline via facade", async () => {
    const getLatestPipeline = vi.fn(async () => ({ id: 10, status: "success", ref: "main", sha: "abc" }));
    const ctx = { gitlab: { getLatestPipeline }, policy: { readOnly: false } } as any;

    const res = (await gitlabGetLatestPipelineTool.handler(
      { project: "group/project", ref: "main" },
      ctx,
    )) as any;

    expect(res.id).toBe(10);
    expect(getLatestPipeline).toHaveBeenCalledWith("group/project", "main");
  });
});

