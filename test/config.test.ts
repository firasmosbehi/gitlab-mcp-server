import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("requires GITLAB_TOKEN by default (pat mode)", () => {
    expect(() => loadConfig({} as any)).toThrow(/GITLAB_TOKEN is required/i);
  });

  it("accepts pat mode with token", () => {
    const cfg = loadConfig({ GITLAB_TOKEN: "x" } as any);
    expect(cfg.gitlabAuthMode).toBe("pat");
    expect(cfg.gitlabToken).toBe("x");
  });

  it("accepts optional trigger token", () => {
    const cfg = loadConfig({ GITLAB_TOKEN: "x", GITLAB_TRIGGER_TOKEN: "t" } as any);
    expect(cfg.gitlabTriggerToken).toBe("t");
  });

  it("requires access token or token file in oauth mode", () => {
    expect(() =>
      loadConfig({ GITLAB_AUTH_MODE: "oauth", GITLAB_HOST: "https://gitlab.com" } as any),
    ).toThrow(/OAuth mode requires/i);
  });

  it("accepts oauth mode with access token", () => {
    const cfg = loadConfig({
      GITLAB_AUTH_MODE: "oauth",
      GITLAB_OAUTH_ACCESS_TOKEN: "at",
      GITLAB_HOST: "https://gitlab.com",
    } as any);
    expect(cfg.gitlabAuthMode).toBe("oauth");
    expect(cfg.gitlabOauthAccessToken).toBe("at");
  });

  it("normalizes http path to start with /", () => {
    const cfg = loadConfig({
      GITLAB_TOKEN: "x",
      GITLAB_MCP_HTTP_PATH: "mcp",
    } as any);
    expect(cfg.httpPath).toBe("/mcp");
  });

  it("parses http settings", () => {
    const cfg = loadConfig({
      GITLAB_TOKEN: "x",
      GITLAB_MCP_TRANSPORT: "http",
      GITLAB_MCP_HTTP_HOST: "0.0.0.0",
      GITLAB_MCP_HTTP_PORT: "8080",
      GITLAB_MCP_HTTP_ALLOWED_HOSTS: "example.com,localhost",
      GITLAB_MCP_HTTP_STATEFUL: "false",
      GITLAB_MCP_HTTP_MAX_SESSIONS: "10",
    } as any);
    expect(cfg.transport).toBe("http");
    expect(cfg.httpHost).toBe("0.0.0.0");
    expect(cfg.httpPort).toBe(8080);
    expect(cfg.httpAllowedHosts?.has("example.com")).toBe(true);
    expect(cfg.httpStateful).toBe(false);
    expect(cfg.httpMaxSessions).toBe(10);
  });
});
