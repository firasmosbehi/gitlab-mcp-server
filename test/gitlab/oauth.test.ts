import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  computeExpiresAtSeconds,
  createGitLabAuthProvider,
  isExpired,
  readOAuthTokenFile,
  writeOAuthTokenFile,
} from "../../src/gitlab/oauth.js";

describe("oauth helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("computes expires_at from created_at + expires_in", () => {
    expect(
      computeExpiresAtSeconds({ access_token: "x", created_at: 100, expires_in: 10 } as any),
    ).toBe(110);
  });

  it("treats token as expired when now is past expires_at (with skew)", () => {
    const token = { access_token: "x", expires_at: 100 } as any;
    expect(isExpired(token, 99, 0)).toBe(false);
    expect(isExpired(token, 100, 0)).toBe(true);
    expect(isExpired(token, 50, 60)).toBe(true);
  });

  it("writes token file with computed expires_at", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gitlab-mcp-oauth-"));
    const file = path.join(dir, "token.json");
    await writeOAuthTokenFile(file, { access_token: "x", created_at: 1, expires_in: 2 } as any);
    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw.access_token).toBe("x");
    expect(raw.expires_at).toBe(3);
    await rm(dir, { recursive: true, force: true });
  });

  it("refreshes an expired token file automatically", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gitlab-mcp-oauth-"));
    const file = path.join(dir, "token.json");

    await writeOAuthTokenFile(file, {
      access_token: "old",
      refresh_token: "rt",
      expires_at: 0,
      client_id: "cid",
      redirect_uri: "http://127.0.0.1/cb",
      token_endpoint: "https://gitlab.example/oauth/token",
    } as any);

    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          access_token: "new",
          refresh_token: "rt2",
          created_at: 10,
          expires_in: 3600,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock as any);
    vi.spyOn(Date, "now").mockReturnValue(1000 * 1000);

    const logger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as any;
    const auth = createGitLabAuthProvider(
      {
        kind: "oauth",
        host: "https://gitlab.example",
        tokenFile: file,
        clientId: "cid",
        redirectUri: "http://127.0.0.1/cb",
      },
      logger,
    );

    const tok = await auth.getToken();
    expect(tok).toBe("new");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const updated = await readOAuthTokenFile(file);
    expect(updated.access_token).toBe("new");

    await rm(dir, { recursive: true, force: true });
  });
});

