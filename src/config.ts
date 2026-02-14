import { z } from "zod";

import { VERSION } from "./version.js";

const LogLevelSchema = z.enum(["error", "warn", "info", "debug"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

const AuthModeSchema = z.enum(["pat", "oauth"]);
export type AuthMode = z.infer<typeof AuthModeSchema>;

const TransportSchema = z.enum(["stdio", "http"]);
export type McpTransport = z.infer<typeof TransportSchema>;

function parseBoolEnv(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

function parseIntEnv(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseCsvSet(value: unknown): Set<string> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!items.length) return undefined;
  return new Set(items);
}

function normalizeHost(host: string): string {
  return host.trim().replace(/\/+$/, "");
}

const EnvSchema = z.object({
  // GitLab auth
  GITLAB_AUTH_MODE: AuthModeSchema.default("pat"),
  GITLAB_TOKEN: z.string().min(1).optional(),
  GITLAB_TRIGGER_TOKEN: z.string().min(1).optional(),
  GITLAB_OAUTH_ACCESS_TOKEN: z.string().min(1).optional(),
  GITLAB_OAUTH_TOKEN_FILE: z.string().min(1).optional(),
  GITLAB_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  GITLAB_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  GITLAB_OAUTH_REDIRECT_URI: z.string().min(1).optional(),

  GITLAB_HOST: z.string().url().default("https://gitlab.com"),
  GITLAB_USER_AGENT: z
    .string()
    .min(1)
    .default(`gitlab-mcp-server/${VERSION}`),
  LOG_LEVEL: LogLevelSchema.default("info"),

  // MCP server policy controls
  GITLAB_MCP_READ_ONLY: z
    .preprocess(parseBoolEnv, z.boolean())
    .optional()
    .default(false),
  GITLAB_MCP_ENABLED_TOOLS: z.string().optional(),
  GITLAB_MCP_DISABLED_TOOLS: z.string().optional(),

  // Server transport
  GITLAB_MCP_TRANSPORT: TransportSchema.default("stdio"),
  GITLAB_MCP_HTTP_HOST: z.string().min(1).default("127.0.0.1"),
  GITLAB_MCP_HTTP_PORT: z.preprocess(parseIntEnv, z.number().int().min(1).max(65535)).default(3000),
  GITLAB_MCP_HTTP_PATH: z.string().min(1).default("/mcp"),
  GITLAB_MCP_HTTP_ALLOWED_HOSTS: z.string().optional(),
  GITLAB_MCP_HTTP_STATEFUL: z.preprocess(parseBoolEnv, z.boolean()).optional().default(true),
  GITLAB_MCP_HTTP_MAX_SESSIONS: z.preprocess(parseIntEnv, z.number().int().min(1).max(10_000)).default(200),
  GITLAB_MCP_HTTP_BEARER_TOKEN: z.string().min(1).optional(),

  // Write safety guardrails
  GITLAB_MCP_WRITE_PROJECT_ALLOWLIST: z.string().optional(),
  GITLAB_MCP_HOST_ALLOWLIST: z.string().optional(),
});

export type Config = Readonly<{
  gitlabHost: string;
  gitlabUserAgent: string;
  logLevel: LogLevel;

  gitlabAuthMode: AuthMode;
  gitlabToken?: string;
  gitlabTriggerToken?: string;
  gitlabOauthAccessToken?: string;
  gitlabOauthTokenFile?: string;
  gitlabOauthClientId?: string;
  gitlabOauthClientSecret?: string;
  gitlabOauthRedirectUri?: string;

  readOnly: boolean;
  enabledTools?: ReadonlySet<string>;
  disabledTools: ReadonlySet<string>;

  transport: McpTransport;
  httpHost: string;
  httpPort: number;
  httpPath: string;
  httpAllowedHosts?: ReadonlySet<string>;
  httpStateful: boolean;
  httpMaxSessions: number;
  httpBearerToken?: string;

  writeProjectAllowlist?: ReadonlySet<string>;
}>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  const gitlabHost = normalizeHost(parsed.GITLAB_HOST);

  const hostAllowlist = parseCsvSet(parsed.GITLAB_MCP_HOST_ALLOWLIST);
  if (hostAllowlist) {
    const normalized = new Set(Array.from(hostAllowlist, normalizeHost));
    if (!normalized.has(gitlabHost)) {
      throw new Error(
        `GITLAB_HOST (${gitlabHost}) is not in GITLAB_MCP_HOST_ALLOWLIST.`,
      );
    }
  }

  if (parsed.GITLAB_AUTH_MODE === "pat") {
    if (!parsed.GITLAB_TOKEN) {
      throw new Error("GITLAB_TOKEN is required when GITLAB_AUTH_MODE=pat.");
    }
  } else if (parsed.GITLAB_AUTH_MODE === "oauth") {
    if (!parsed.GITLAB_OAUTH_ACCESS_TOKEN && !parsed.GITLAB_OAUTH_TOKEN_FILE) {
      throw new Error(
        "OAuth mode requires GITLAB_OAUTH_ACCESS_TOKEN or GITLAB_OAUTH_TOKEN_FILE (set GITLAB_AUTH_MODE=oauth).",
      );
    }
  }

  const httpPath = parsed.GITLAB_MCP_HTTP_PATH.startsWith("/")
    ? parsed.GITLAB_MCP_HTTP_PATH
    : `/${parsed.GITLAB_MCP_HTTP_PATH}`;

  return {
    gitlabHost,
    gitlabUserAgent: parsed.GITLAB_USER_AGENT,
    logLevel: parsed.LOG_LEVEL,

    gitlabAuthMode: parsed.GITLAB_AUTH_MODE,
    gitlabToken: parsed.GITLAB_TOKEN,
    gitlabTriggerToken: parsed.GITLAB_TRIGGER_TOKEN,
    gitlabOauthAccessToken: parsed.GITLAB_OAUTH_ACCESS_TOKEN,
    gitlabOauthTokenFile: parsed.GITLAB_OAUTH_TOKEN_FILE,
    gitlabOauthClientId: parsed.GITLAB_OAUTH_CLIENT_ID,
    gitlabOauthClientSecret: parsed.GITLAB_OAUTH_CLIENT_SECRET,
    gitlabOauthRedirectUri: parsed.GITLAB_OAUTH_REDIRECT_URI,

    readOnly: parsed.GITLAB_MCP_READ_ONLY,
    enabledTools: parseCsvSet(parsed.GITLAB_MCP_ENABLED_TOOLS),
    disabledTools: parseCsvSet(parsed.GITLAB_MCP_DISABLED_TOOLS) ?? new Set(),

    transport: parsed.GITLAB_MCP_TRANSPORT,
    httpHost: parsed.GITLAB_MCP_HTTP_HOST,
    httpPort: parsed.GITLAB_MCP_HTTP_PORT,
    httpPath,
    httpAllowedHosts: parseCsvSet(parsed.GITLAB_MCP_HTTP_ALLOWED_HOSTS),
    httpStateful: parsed.GITLAB_MCP_HTTP_STATEFUL,
    httpMaxSessions: parsed.GITLAB_MCP_HTTP_MAX_SESSIONS,
    httpBearerToken: parsed.GITLAB_MCP_HTTP_BEARER_TOKEN,

    writeProjectAllowlist: parseCsvSet(parsed.GITLAB_MCP_WRITE_PROJECT_ALLOWLIST),
  };
}
