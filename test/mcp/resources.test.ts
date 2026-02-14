import { describe, expect, it, vi } from "vitest";

import {
  listGitlabResources,
  listGitlabResourceTemplates,
  readGitlabResource,
} from "../../src/mcp/resources.js";

describe("mcp resources", () => {
  it("lists help resource", () => {
    const resources = listGitlabResources();
    expect(resources.some((r) => r.uri === "gitlab://help")).toBe(true);
  });

  it("lists resource templates", () => {
    const templates = listGitlabResourceTemplates();
    expect(templates.some((t) => t.name === "gitlab_file")).toBe(true);
    expect(templates.some((t) => t.name === "gitlab_job_log")).toBe(true);
  });

  it("reads help", async () => {
    const out = await readGitlabResource("gitlab://help", { gitlab: {} } as any);
    expect(out[0]?.text).toContain("Repo file");
  });

  it("reads file resource via facade", async () => {
    const getFile = vi.fn(async () => ({
      file_path: "README.md",
      ref: "main",
      content: "hello",
      size_bytes: 5,
    }));

    const out = await readGitlabResource(
      "gitlab://file?project=group%2Fproject&ref=main&path=README.md",
      { gitlab: { getFile } } as any,
    );

    expect(getFile).toHaveBeenCalledWith("group/project", "README.md", "main");
    expect(out[0]?.text).toContain("README.md @ main");
  });

  it("reads job log resource via facade and truncates", async () => {
    const getJobLog = vi.fn(async () => "x".repeat(200));
    const out = await readGitlabResource(
      "gitlab://job-log?project=group%2Fproject&job_id=1&max_chars=50",
      { gitlab: { getJobLog } } as any,
    );
    expect(getJobLog).toHaveBeenCalledWith("group/project", 1);
    expect(out[0]?.text).toContain("[truncated:");
  });
});

