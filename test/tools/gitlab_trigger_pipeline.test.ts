import { describe, expect, it, vi } from "vitest";

import { gitlabTriggerPipelineTool } from "../../src/tools/gitlab_trigger_pipeline.js";

describe("gitlab_trigger_pipeline", () => {
  it("triggers a pipeline via facade", async () => {
    const triggerPipeline = vi.fn(async () => ({ id: 10, status: "running", ref: "main", sha: "abc" }));
    const ctx = { gitlab: { triggerPipeline }, policy: { readOnly: false } } as any;

    const res = (await gitlabTriggerPipelineTool.handler(
      {
        project: "group/project",
        ref: "main",
        token: "t",
        variables: [{ key: "A", value: "1" }],
      },
      ctx,
    )) as any;

    expect(res.id).toBe(10);
    expect(triggerPipeline).toHaveBeenCalledWith("group/project", "main", {
      token: "t",
      variables: [{ key: "A", value: "1" }],
    });
  });

  it("blocks in read-only mode", async () => {
    const triggerPipeline = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { triggerPipeline }, policy: { readOnly: true } } as any;

    await expect(
      gitlabTriggerPipelineTool.handler({ project: "group/project", ref: "main" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(triggerPipeline).toHaveBeenCalledTimes(0);
  });
});

