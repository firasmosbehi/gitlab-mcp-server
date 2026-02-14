import { describe, expect, it, vi } from "vitest";

import { gitlabGetJobLogTailTool } from "../../src/tools/gitlab_get_job_log_tail.js";

describe("gitlab_get_job_log_tail", () => {
  it("returns last N lines from tail text", async () => {
    const getJobLogTail = vi.fn(async () => ({
      text: "a\nb\nc\nd\n",
      is_partial: true,
      bytes_total: 1234,
      bytes_start: 1000,
      bytes_end: 1233,
    }));

    const ctx = { gitlab: { getJobLogTail } } as any;

    const res = (await gitlabGetJobLogTailTool.handler(
      { project: "group/project", job_id: 1, lines: 2, max_bytes: 1000 },
      ctx,
    )) as any;

    expect(getJobLogTail).toHaveBeenCalledWith("group/project", 1, 1000);
    expect(res.log_tail).toBe("c\nd");
    expect(res.is_partial).toBe(true);
    expect(res.bytes_total).toBe(1234);
  });
});
