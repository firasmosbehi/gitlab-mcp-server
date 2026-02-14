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

describe("createGitlabFacade triggerPipeline", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws a clear error when no trigger token is configured", async () => {
    const facade = makeFacade();
    await expect(facade.triggerPipeline("group/project", "main")).rejects.toThrow(/trigger token/i);
  });
});

