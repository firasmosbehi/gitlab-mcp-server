import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createGitlabFacade } from "../../src/gitlab/client.js";

function makeFacade() {
  const config = {
    gitlabHost: "https://gitlab.example",
    gitlabToken: "token",
    gitlabUserAgent: "ua",
  } as any;

  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as any;

  return createGitlabFacade(config, logger);
}

describe("createGitlabFacade artifacts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("blocks download when metadata size exceeds maxBytes", async () => {
    const fetchMock = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes("/artifacts")) {
        return new Response("should not be fetched", { status: 500 });
      }

      return new Response(
        JSON.stringify({ artifacts_file: { filename: "a.zip", size: 999 } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    vi.stubGlobal("fetch", fetchMock as any);

    const facade = makeFacade();
    await expect(
      facade.downloadJobArtifacts("group/project", 1, { maxBytes: 10 }),
    ).rejects.toThrow(/too large/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("enforces maxBytes while streaming artifacts download", async () => {
    const bytes = new Uint8Array(200);
    bytes.fill(1);

    const fetchMock = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes("/artifacts")) {
        return new Response(bytes, { status: 200 });
      }

      return new Response(
        JSON.stringify({ artifacts_file: { filename: "a.zip" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    vi.stubGlobal("fetch", fetchMock as any);

    const facade = makeFacade();
    await expect(
      facade.downloadJobArtifacts("group/project", 1, { maxBytes: 100 }),
    ).rejects.toThrow(/exceeds limit/i);

    const targetPath = path.join(
      tmpdir(),
      "gitlab-mcp-server",
      "artifacts",
      "group_project",
      "1-a.zip",
    );

    await expect(access(targetPath)).rejects.toThrow();
  });
});
