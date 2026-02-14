import { createHash, randomBytes, randomUUID } from "node:crypto";
import http from "node:http";
import { once } from "node:events";
import { URL } from "node:url";

import type { Logger } from "../logger.js";
import {
  exchangeOAuthCodeForToken,
  refreshOAuthToken,
  readOAuthTokenFile,
  writeOAuthTokenFile,
} from "../gitlab/oauth.js";

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(input: string): string {
  const hash = createHash("sha256").update(input).digest();
  return base64Url(hash);
}

function parseArgs(argv: string[]): Readonly<{ cmd: string[]; flags: Record<string, string | boolean> }> {
  const cmd: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? "";
    if (!a.startsWith("-")) {
      cmd.push(a);
      continue;
    }

    const key = a.replace(/^--?/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("-")) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }

  return { cmd, flags };
}

function usage(): string {
  return [
    "gitlab-mcp-server auth",
    "",
    "Commands:",
    "  auth login    Browser-based OAuth (Authorization Code + PKCE) and write token file",
    "  auth refresh  Refresh an OAuth token file (requires refresh_token)",
    "",
    "Common flags (also supported via env):",
    "  --host <url>            GitLab host (default: GITLAB_HOST or https://gitlab.com)",
    "  --client-id <id>        OAuth application client ID (GITLAB_OAUTH_CLIENT_ID)",
    "  --client-secret <sec>   OAuth client secret (optional) (GITLAB_OAUTH_CLIENT_SECRET)",
    "  --redirect-uri <uri>    Redirect URI (if omitted, a localhost callback is used)",
    "  --scopes <scopes>       Space-separated scopes (default: read_api)",
    "  --out <path>            Token file path (default: GITLAB_OAUTH_TOKEN_FILE or ./gitlab-oauth-token.json)",
    "  --file <path>           Token file path for refresh (same default as --out)",
    "",
    "Examples:",
    "  gitlab-mcp-server auth login --client-id ... --scopes \"read_api\" --out ./gitlab-oauth.json",
    "  gitlab-mcp-server auth refresh --file ./gitlab-oauth.json",
  ].join("\n");
}

async function waitForOAuthCallback(
  logger: Logger,
  redirectPath: string,
  expectedState: string,
): Promise<Readonly<{ redirectUri: string; waitForCode: Promise<string>; close: () => void }>> {
  const server = http.createServer();

  let codeResolve!: (value: { code: string; redirectUri: string }) => void;
  let codeReject!: (reason?: unknown) => void;
  const codePromise = new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
    codeResolve = resolve;
    codeReject = reject;
  });

  server.on("request", (req, res) => {
    try {
      const reqUrl = new URL(req.url ?? "/", "http://localhost");
      if (reqUrl.pathname !== redirectPath) {
        res.statusCode = 404;
        res.setHeader("content-type", "text/plain");
        res.end("Not found");
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const state = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");
      const errorDescription = reqUrl.searchParams.get("error_description");
      if (error) {
        res.statusCode = 400;
        res.setHeader("content-type", "text/plain");
        res.end(`OAuth error: ${error}\n${errorDescription ?? ""}`.trim());
        codeReject(new Error(`OAuth error: ${error}${errorDescription ? ` (${errorDescription})` : ""}`));
        return;
      }

      if (!code) {
        res.statusCode = 400;
        res.setHeader("content-type", "text/plain");
        res.end("Missing 'code' in callback URL.");
        codeReject(new Error("Missing 'code' in callback URL."));
        return;
      }

      if (!state) {
        res.statusCode = 400;
        res.setHeader("content-type", "text/plain");
        res.end("Missing 'state' in callback URL.");
        codeReject(new Error("Missing 'state' in callback URL."));
        return;
      }

      if (state !== expectedState) {
        res.statusCode = 400;
        res.setHeader("content-type", "text/plain");
        res.end("State mismatch.");
        codeReject(new Error("State mismatch."));
        return;
      }

      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(
        [
          "<!doctype html>",
          "<meta charset=\"utf-8\" />",
          "<title>gitlab-mcp-server</title>",
          "<h2>Authentication complete</h2>",
          "<p>You can close this tab and return to your terminal.</p>",
        ].join("\n"),
      );

      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const redirectUri = `http://127.0.0.1:${port}${redirectPath}`;
      codeResolve({ code, redirectUri });
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain");
      res.end("Internal error");
      codeReject(err);
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const redirectUri = `http://127.0.0.1:${port}${redirectPath}`;
  logger.info("OAuth callback server listening", { redirectUri });

  return {
    redirectUri,
    waitForCode: (async () => {
      try {
        const out = await codePromise;
        return out.code;
      } finally {
        server.close();
      }
    })(),
    close: () => server.close(),
  };
}

export async function runAuthCli(argv: string[], env: NodeJS.ProcessEnv, logger: Logger): Promise<void> {
  const parsed = parseArgs(argv);
  const [sub] = parsed.cmd;

  if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const host = String(parsed.flags.host ?? env.GITLAB_HOST ?? "https://gitlab.com").replace(/\/+$/, "");
  const clientId = String(parsed.flags["client-id"] ?? env.GITLAB_OAUTH_CLIENT_ID ?? "");
  const clientSecret =
    typeof parsed.flags["client-secret"] === "string"
      ? String(parsed.flags["client-secret"])
      : env.GITLAB_OAUTH_CLIENT_SECRET;

  const outFileDefault = String(env.GITLAB_OAUTH_TOKEN_FILE ?? "./gitlab-oauth-token.json");
  const outFile =
    String(
      parsed.flags.out ??
        parsed.flags.file ??
        env.GITLAB_OAUTH_TOKEN_FILE ??
        outFileDefault,
    );

  const tokenEndpoint = `${host}/oauth/token`;

  if (sub === "login") {
    if (!clientId) {
      throw new Error("Missing --client-id (or set GITLAB_OAUTH_CLIENT_ID).");
    }

    const scopesRaw = String(parsed.flags.scopes ?? env.GITLAB_OAUTH_SCOPES ?? "read_api").trim();
    const scopes = scopesRaw.replace(/,/g, " ").replace(/\s+/g, " ").trim();

    const state = randomUUID();
    const codeVerifier = base64Url(randomBytes(32));
    const codeChallenge = sha256Base64Url(codeVerifier);

    const redirectPath = "/oauth/callback";

    const redirectUriFlag =
      typeof parsed.flags["redirect-uri"] === "string" ? String(parsed.flags["redirect-uri"]) : env.GITLAB_OAUTH_REDIRECT_URI;

    const callback =
      redirectUriFlag ? undefined : await waitForOAuthCallback(logger, redirectPath, state);

    const redirectUri = redirectUriFlag ?? callback!.redirectUri;

    const authorizeUrl = new URL(`${host}/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("scope", scopes);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    process.stdout.write(
      [
        "Open this URL in your browser to authorize:",
        "",
        authorizeUrl.toString(),
        "",
        `Waiting for OAuth callback on ${redirectUri} ...`,
      ].join("\n") + "\n",
    );

    let code: string;
    if (redirectUriFlag) {
      // Manual mode: user-provided redirect URI; we cannot capture automatically.
      // Ask the user to paste the redirected URL.
      process.stdin.resume();
      process.stdout.write("\nAfter authorizing, paste the full redirected URL here:\n> ");
      const input = await once(process.stdin, "data");
      const text = String(input[0] ?? "").trim();
      const url = new URL(text);
      if (url.searchParams.get("state") !== state) throw new Error("State mismatch.");
      code = url.searchParams.get("code") ?? "";
      if (!code) throw new Error("Missing code in redirected URL.");
    } else {
      code = await callback!.waitForCode;
    }

    const token = await exchangeOAuthCodeForToken(tokenEndpoint, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const enriched = {
      ...token,
      client_id: clientId,
      redirect_uri: redirectUri,
      token_endpoint: tokenEndpoint,
    };

    await writeOAuthTokenFile(outFile, enriched);

    process.stdout.write(`\nWrote OAuth token file: ${outFile}\n`);
    process.stdout.write(
      [
        "To use it:",
        `  export GITLAB_AUTH_MODE=oauth`,
        `  export GITLAB_HOST=${host}`,
        `  export GITLAB_OAUTH_TOKEN_FILE=${outFile}`,
        "",
      ].join("\n"),
    );
    return;
  }

  if (sub === "refresh") {
    const filePath = outFile;
    const token = await readOAuthTokenFile(filePath);
    const refreshToken = token.refresh_token;
    if (!refreshToken) {
      throw new Error("Token file has no refresh_token. Re-run `auth login` to obtain one.");
    }

    const effectiveClientId = clientId || token.client_id;
    const redirectUri = (typeof parsed.flags["redirect-uri"] === "string"
      ? String(parsed.flags["redirect-uri"])
      : env.GITLAB_OAUTH_REDIRECT_URI) || token.redirect_uri;

    if (!effectiveClientId || !redirectUri) {
      throw new Error(
        "Refresh requires --client-id/--redirect-uri (or token file must include client_id and redirect_uri).",
      );
    }

    const effectiveTokenEndpoint = token.token_endpoint ?? tokenEndpoint;
    const refreshed = await refreshOAuthToken(effectiveTokenEndpoint, {
      client_id: effectiveClientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      redirect_uri: redirectUri,
    });

    const enriched = {
      ...refreshed,
      client_id: effectiveClientId,
      redirect_uri: redirectUri,
      token_endpoint: effectiveTokenEndpoint,
    };

    await writeOAuthTokenFile(filePath, enriched);
    process.stdout.write(`Refreshed OAuth token file: ${filePath}\n`);
    return;
  }

  throw new Error(`Unknown auth subcommand: ${sub}`);
}
