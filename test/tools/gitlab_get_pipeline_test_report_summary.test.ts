import { describe, expect, it, vi } from "vitest";

import { gitlabGetPipelineTestReportSummaryTool } from "../../src/tools/gitlab_get_pipeline_test_report_summary.js";

describe("gitlab_get_pipeline_test_report_summary", () => {
  it("gets test report summary via facade", async () => {
    const getPipelineTestReportSummary = vi.fn(async () => ({
      total: { time: 1, count: 2, success: 1, failed: 1, skipped: 0, error: 0, suite_error: null },
      test_suites: [{ name: "unit", total_time: 1, total_count: 2, success_count: 1, failed_count: 1, skipped_count: 0, error_count: 0 }],
      is_truncated: false,
    }));

    const ctx = { gitlab: { getPipelineTestReportSummary }, policy: { readOnly: false } } as any;

    const res = (await gitlabGetPipelineTestReportSummaryTool.handler(
      { project: "group/project", pipeline_id: 10, include_suites: true, max_suites: 5 },
      ctx,
    )) as any;

    expect(getPipelineTestReportSummary).toHaveBeenCalledWith("group/project", 10, {
      includeSuites: true,
      maxSuites: 5,
    });
    expect(res.total.count).toBe(2);
  });
});

