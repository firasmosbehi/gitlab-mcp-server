import { describe, expect, it } from "vitest";

import { gitlabGetJobLogTool } from "../../src/tools/gitlab_get_job_log.js";

describe("gitlab_get_job_log", () => {
  it("truncates job log to max_chars", async () => {
    const ctx = {
      gitlab: {
        getJobLog: async () => "x".repeat(200),
      },
    } as any;

    const res = (await gitlabGetJobLogTool.handler(
      { project: "group/project", job_id: 1, max_chars: 50 },
      ctx,
    )) as any;

    expect(res.log).toContain("[truncated:");
    expect(res.log_truncated).toBe(true);
  });
});
