import { describe, expect, it, vi } from "vitest";

import { gitlabUpdateMergeRequestTool } from "../../src/tools/gitlab_update_merge_request.js";

describe("gitlab_update_merge_request", () => {
  it("validates update fields", () => {
    expect(() => gitlabUpdateMergeRequestTool.schema.parse({ project: "p", iid: 1 })).toThrow(
      /at least one update/i,
    );

    expect(() =>
      gitlabUpdateMergeRequestTool.schema.parse({
        project: "p",
        iid: 1,
        labels: ["a"],
        add_labels: ["b"],
      }),
    ).toThrow(/either 'labels'.*not both/i);
  });

  it("updates a merge request via facade", async () => {
    const updateMergeRequest = vi.fn(async () => ({ iid: 1, title: "t", state: "opened", web_url: "" }));
    const ctx = { gitlab: { updateMergeRequest }, policy: { readOnly: false } } as any;

    const res = (await gitlabUpdateMergeRequestTool.handler(
      { project: "group/project", iid: 7, title: "New title", labels: ["bug"] },
      ctx,
    )) as any;

    expect(updateMergeRequest).toHaveBeenCalledWith("group/project", 7, {
      title: "New title",
      description: undefined,
      stateEvent: undefined,
      labels: ["bug"],
      addLabels: undefined,
      removeLabels: undefined,
      assigneeId: undefined,
      reviewerIds: undefined,
      targetBranch: undefined,
      removeSourceBranch: undefined,
      squash: undefined,
    });
    expect(res.iid).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const updateMergeRequest = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { updateMergeRequest }, policy: { readOnly: true } } as any;

    await expect(
      gitlabUpdateMergeRequestTool.handler({ project: "group/project", iid: 7, title: "t" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(updateMergeRequest).toHaveBeenCalledTimes(0);
  });
});

