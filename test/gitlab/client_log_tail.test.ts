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

describe("createGitlabFacade getJobLogTail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses Range to fetch bounded trace tail", async () => {
    const fetchMock = vi.fn(async (_url: any, init: any) => {
      expect(init?.headers?.Range).toBe("bytes=-123");
      return new Response("a\nb\nc\n", {
        status: 206,
        headers: { "content-range": "bytes 10-20/30" },
      });
    });

    vi.stubGlobal("fetch", fetchMock as any);

    const facade = makeFacade();
    const out = await facade.getJobLogTail("group/project", 1, 123);
    expect(out.text).toContain("a");
    expect(out.is_partial).toBe(true);
  });
});

