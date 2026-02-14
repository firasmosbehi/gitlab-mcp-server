import { describe, expect, it, vi } from "vitest";

import { gitlabCreateCommitTool } from "../../src/tools/gitlab_create_commit.js";

describe("gitlab_create_commit", () => {
  it("maps file_path to filePath and omits encoding when text", async () => {
    const createCommit = vi.fn(async (..._args: any[]) => ({ ok: true }));
    const ctx = {
      gitlab: { createCommit },
      policy: { readOnly: false },
    } as any;

    const res = (await gitlabCreateCommitTool.handler(
      {
        project: "group/project",
        branch: "feature",
        commit_message: "test",
        actions: [
          { action: "create", file_path: "src/a.txt", content: "hello" },
          {
            action: "update",
            file_path: "src/b.txt",
            content: Buffer.from("world", "utf8").toString("base64"),
            encoding: "base64",
          },
          { action: "delete", file_path: "src/c.txt" },
        ],
      },
      ctx,
    )) as any;

    expect(res).toEqual({ ok: true });
    expect(createCommit).toHaveBeenCalledTimes(1);

    const call = createCommit.mock.calls[0]!;
    const actions = call[3];
    const opts = call[4];
    expect(opts).toEqual({ startBranch: undefined });
    expect(actions[0]).toMatchObject({ action: "create", filePath: "src/a.txt", content: "hello" });
    expect(actions[0].encoding).toBeUndefined();

    expect(actions[1]).toMatchObject({
      action: "update",
      filePath: "src/b.txt",
      encoding: "base64",
    });

    expect(actions[2]).toMatchObject({ action: "delete", filePath: "src/c.txt" });
    expect(actions[2].content).toBeUndefined();
  });

  it("blocks in read-only mode", async () => {
    const createCommit = vi.fn(async (..._args: any[]) => ({ ok: true }));
    const ctx = {
      gitlab: { createCommit },
      policy: { readOnly: true },
    } as any;

    await expect(
      gitlabCreateCommitTool.handler(
        {
          project: "group/project",
          branch: "feature",
          commit_message: "test",
          actions: [{ action: "create", file_path: "src/a.txt", content: "hello" }],
        },
        ctx,
      ),
    ).rejects.toThrow(/read-only/i);

    expect(createCommit).toHaveBeenCalledTimes(0);
  });
});
