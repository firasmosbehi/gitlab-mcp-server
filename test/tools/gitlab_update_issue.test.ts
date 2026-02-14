import { describe, expect, it, vi } from "vitest";

import { gitlabUpdateIssueTool } from "../../src/tools/gitlab_update_issue.js";

describe("gitlab_update_issue", () => {
  it("validates update fields", () => {
    expect(() => gitlabUpdateIssueTool.schema.parse({ project: "p", iid: 1 })).toThrow(
      /at least one update/i,
    );

    expect(() =>
      gitlabUpdateIssueTool.schema.parse({
        project: "p",
        iid: 1,
        labels: ["a"],
        add_labels: ["b"],
      }),
    ).toThrow(/either 'labels'.*not both/i);
  });

  it("updates an issue via facade", async () => {
    const updateIssue = vi.fn(async () => ({ iid: 1, title: "t", state: "opened", labels: [], web_url: "" }));
    const ctx = { gitlab: { updateIssue }, policy: { readOnly: false } } as any;

    const res = (await gitlabUpdateIssueTool.handler(
      { project: "group/project", iid: 12, state_event: "close" },
      ctx,
    )) as any;

    expect(updateIssue).toHaveBeenCalledWith("group/project", 12, {
      title: undefined,
      description: undefined,
      stateEvent: "close",
      labels: undefined,
      addLabels: undefined,
      removeLabels: undefined,
    });
    expect(res.iid).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const updateIssue = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { updateIssue }, policy: { readOnly: true } } as any;

    await expect(
      gitlabUpdateIssueTool.handler({ project: "group/project", iid: 12, state_event: "close" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(updateIssue).toHaveBeenCalledTimes(0);
  });
});

