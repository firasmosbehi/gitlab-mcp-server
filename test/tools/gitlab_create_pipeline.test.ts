import { describe, expect, it, vi } from "vitest";

import { gitlabCreatePipelineTool } from "../../src/tools/gitlab_create_pipeline.js";

describe("gitlab_create_pipeline", () => {
  it("creates a pipeline via facade", async () => {
    const createPipeline = vi.fn(async () => ({ id: 10, status: "running", ref: "main", sha: "abc" }));
    const ctx = { gitlab: { createPipeline }, policy: { readOnly: false } } as any;

    const res = (await gitlabCreatePipelineTool.handler(
      {
        project: "group/project",
        ref: "main",
        variables: [{ key: "A", value: "1" }],
      },
      ctx,
    )) as any;

    expect(res.id).toBe(10);
    expect(createPipeline).toHaveBeenCalledWith("group/project", "main", {
      variables: [{ key: "A", value: "1" }],
    });
  });

  it("blocks in read-only mode", async () => {
    const createPipeline = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { createPipeline }, policy: { readOnly: true } } as any;

    await expect(
      gitlabCreatePipelineTool.handler({ project: "group/project", ref: "main" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(createPipeline).toHaveBeenCalledTimes(0);
  });
});

