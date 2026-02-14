import { describe, expect, it, vi } from "vitest";

import { gitlabCreateIssueTool } from "../../src/tools/gitlab_create_issue.js";

describe("gitlab_create_issue", () => {
  it("creates an issue via facade", async () => {
    const createIssue = vi.fn(async () => ({ iid: 1, title: "t", state: "opened", labels: [], web_url: "" }));
    const ctx = { gitlab: { createIssue }, policy: { readOnly: false } } as any;

    const res = (await gitlabCreateIssueTool.handler(
      { project: "group/project", title: "Hello", description: "Body", labels: ["bug"] },
      ctx,
    )) as any;

    expect(createIssue).toHaveBeenCalledWith("group/project", "Hello", {
      description: "Body",
      labels: ["bug"],
    });
    expect(res.iid).toBe(1);
  });

  it("blocks in read-only mode", async () => {
    const createIssue = vi.fn(async () => ({ ok: true }));
    const ctx = { gitlab: { createIssue }, policy: { readOnly: true } } as any;

    await expect(
      gitlabCreateIssueTool.handler({ project: "group/project", title: "Hello" }, ctx),
    ).rejects.toThrow(/read-only/i);

    expect(createIssue).toHaveBeenCalledTimes(0);
  });
});

