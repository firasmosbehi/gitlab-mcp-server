import { describe, expect, it, vi } from "vitest";

import { gitlabGetCurrentUserTool } from "../../src/tools/gitlab_get_current_user.js";

describe("gitlab_get_current_user", () => {
  it("gets current user via facade", async () => {
    const getCurrentUser = vi.fn(async () => ({ id: 1, username: "u", name: "User" }));
    const ctx = { gitlab: { getCurrentUser }, policy: { readOnly: false } } as any;

    const res = (await gitlabGetCurrentUserTool.handler({}, ctx)) as any;

    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(res.id).toBe(1);
  });
});

