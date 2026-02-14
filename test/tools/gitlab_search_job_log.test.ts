import { describe, expect, it, vi } from "vitest";

import { gitlabSearchJobLogTool } from "../../src/tools/gitlab_search_job_log.js";

describe("gitlab_search_job_log", () => {
  it("finds matching lines and returns context", async () => {
    const getJobLogTail = vi.fn(async () => ({
      text: ["one", "two", "ERR boom", "four", "five"].join("\n"),
      is_partial: true,
    }));

    const ctx = { gitlab: { getJobLogTail } } as any;

    const res = (await gitlabSearchJobLogTool.handler(
      {
        project: "group/project",
        job_id: 1,
        query: "err",
        case_insensitive: true,
        context_lines: 1,
        max_matches: 10,
        max_bytes: 1000,
      },
      ctx,
    )) as any;

    expect(res.matches_found).toBe(1);
    expect(res.matches[0].line).toContain("ERR boom");
    expect(res.matches[0].context_before).toEqual(["two"]);
    expect(res.matches[0].context_after).toEqual(["four"]);
  });
});

