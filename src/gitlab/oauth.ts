import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Logger } from "../logger.js";

export type OAuthToken = Readonly<{
  access_token: string;
  token_type?: string;
  refresh_token?: string;
  scope?: string;
  created_at?: number;
  expires_in?: number;
  // Computed epoch seconds; preferred when present.
  expires_at?: number;

  // Optional metadata for refresh ergonomics
  client_id?: string;
  redirect_uri?: string;
  token_endpoint?: string;
}>;

export function computeExpiresAtSeconds(token: OAuthToken): number | undefined {
  if (typeof token.expires_at === "number" && Number.isFinite(token.expires_at)) return token.expires_at;
  if (
    typeof token.created_at === "number" &&
    Number.isFinite(token.created_at) &&
    typeof token.expires_in === "number" &&
    Number.isFinite(token.expires_in)
  ) {
    return token.created_at + token.expires_in;
  }
  return undefined;
}

export function isExpired(token: OAuthToken, nowSeconds: number, skewSeconds = 60): boolean {
  const expiresAt = computeExpiresAtSeconds(token);
  if (expiresAt === undefined) return false;
  return nowSeconds >= expiresAt - Math.max(0, skewSeconds);
}

export async function readOAuthTokenFile(filePath: string): Promise<OAuthToken> {
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as any;
  if (!parsed || typeof parsed !== "object") throw new Error("Invalid OAuth token file JSON.");
  if (typeof parsed.access_token !== "string" || !parsed.access_token) {
    throw new Error("Invalid OAuth token file: missing access_token.");
  }
  return parsed as OAuthToken;
}

async function writeJsonAtomic(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp`;
  await writeFile(tmpPath, contents, "utf8");
  await chmod(tmpPath, 0o600).catch(() => undefined);
  await rename(tmpPath, filePath);
  await chmod(filePath, 0o600).catch(() => undefined);
}

export async function writeOAuthTokenFile(filePath: string, token: OAuthToken): Promise<void> {
  const expires_at = computeExpiresAtSeconds(token);
  const out: OAuthToken = {
    ...token,
    expires_at,
  };
  await writeJsonAtomic(filePath, `${JSON.stringify(out, null, 2)}\n`);
}

function toFormUrlEncoded(body: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue;
    params.set(k, v);
  }
  return params.toString();
}

export async function refreshOAuthToken(
  tokenEndpoint: string,
  params: {
    client_id: string;
    refresh_token: string;
    redirect_uri: string;
    client_secret?: string;
  },
): Promise<OAuthToken> {
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: toFormUrlEncoded({
      grant_type: "refresh_token",
      client_id: params.client_id,
      refresh_token: params.refresh_token,
      redirect_uri: params.redirect_uri,
      client_secret: params.client_secret,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const snippet = text.length > 500 ? `${text.slice(0, 500)}...` : text;
    throw new Error(`OAuth refresh failed (${res.status}): ${snippet}`);
  }

  const json = (await res.json()) as any;
  if (!json || typeof json.access_token !== "string") {
    throw new Error("OAuth refresh failed: missing access_token in response.");
  }

  return json as OAuthToken;
}

export async function exchangeOAuthCodeForToken(
  tokenEndpoint: string,
  params: {
    client_id: string;
    code: string;
    redirect_uri: string;
    code_verifier: string;
    client_secret?: string;
  },
): Promise<OAuthToken> {
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: toFormUrlEncoded({
      grant_type: "authorization_code",
      client_id: params.client_id,
      code: params.code,
      redirect_uri: params.redirect_uri,
      code_verifier: params.code_verifier,
      client_secret: params.client_secret,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const snippet = text.length > 500 ? `${text.slice(0, 500)}...` : text;
    throw new Error(`OAuth code exchange failed (${res.status}): ${snippet}`);
  }

  const json = (await res.json()) as any;
  if (!json || typeof json.access_token !== "string") {
    throw new Error("OAuth code exchange failed: missing access_token in response.");
  }

  return json as OAuthToken;
}

export type GitLabAuthProvider = Readonly<{
  kind: "pat" | "oauth";
  getToken: () => Promise<string>;
  getAuthHeaders: () => Promise<Record<string, string>>;
}>;

export function createGitLabAuthProvider(
  opts:
    | Readonly<{ kind: "pat"; token: string }>
    | Readonly<{
        kind: "oauth";
        host: string;
        accessToken?: string;
        tokenFile?: string;
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
      }>,
  logger: Logger,
): GitLabAuthProvider {
  if (opts.kind === "pat") {
    const tok = opts.token;
    return {
      kind: "pat",
      getToken: async () => tok,
      getAuthHeaders: async () => ({ "PRIVATE-TOKEN": tok }),
    };
  }

  const oauthOpts = opts as Extract<typeof opts, { kind: "oauth" }>;
  const tokenEndpoint = `${oauthOpts.host}/oauth/token`;

  let loaded = false;
  let state: OAuthToken | undefined;
  let refreshInFlight: Promise<void> | undefined;

  async function loadIfNeeded(): Promise<void> {
    if (loaded) return;
    loaded = true;

    if (oauthOpts.accessToken) {
      state = { access_token: oauthOpts.accessToken };
      return;
    }

    if (!oauthOpts.tokenFile) {
      throw new Error("OAuth mode requires accessToken or tokenFile.");
    }

    state = await readOAuthTokenFile(oauthOpts.tokenFile);
  }

  async function maybeRefresh(): Promise<void> {
    if (!oauthOpts.tokenFile) return;
    if (!state) return;

    const now = Math.floor(Date.now() / 1000);
    if (!isExpired(state, now, 60)) return;

    const refreshToken = state.refresh_token;
    if (!refreshToken) {
      throw new Error(
        "OAuth token is expired and no refresh_token is available. Run `gitlab-mcp-server auth refresh` or re-login.",
      );
    }

    const clientId = oauthOpts.clientId ?? state.client_id;
    const redirectUri = oauthOpts.redirectUri ?? state.redirect_uri;
    if (!clientId || !redirectUri) {
      throw new Error(
        "OAuth token refresh requires GITLAB_OAUTH_CLIENT_ID and GITLAB_OAUTH_REDIRECT_URI (or token file must include client_id and redirect_uri).",
      );
    }

    if (refreshInFlight) {
      await refreshInFlight;
      return;
    }

    refreshInFlight = (async () => {
      logger.info("Refreshing GitLab OAuth token", { tokenFile: oauthOpts.tokenFile });
      const refreshed = await refreshOAuthToken(tokenEndpoint, {
        client_id: clientId,
        client_secret: oauthOpts.clientSecret,
        refresh_token: refreshToken,
        redirect_uri: redirectUri,
      });

      // Preserve metadata we might need for future refreshes.
      state = {
        ...refreshed,
        client_id: clientId,
        redirect_uri: redirectUri,
        token_endpoint: state?.token_endpoint ?? tokenEndpoint,
      };

      await writeOAuthTokenFile(oauthOpts.tokenFile!, state);
    })();

    try {
      await refreshInFlight;
    } finally {
      refreshInFlight = undefined;
    }
  }

  async function getToken(): Promise<string> {
    await loadIfNeeded();
    if (!state) throw new Error("OAuth token state not loaded.");
    await maybeRefresh();
    if (!state?.access_token) throw new Error("OAuth token missing access_token.");
    return state.access_token;
  }

  return {
    kind: "oauth",
    getToken,
    getAuthHeaders: async () => ({ Authorization: `Bearer ${await getToken()}` }),
  };
}
