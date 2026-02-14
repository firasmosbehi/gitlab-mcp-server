import { z } from "zod";

import { VERSION } from "./version.js";

const LogLevelSchema = z.enum(["error", "warn", "info", "debug"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

function parseBoolEnv(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
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
  GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
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

  // Write safety guardrails
  GITLAB_MCP_WRITE_PROJECT_ALLOWLIST: z.string().optional(),
  GITLAB_MCP_HOST_ALLOWLIST: z.string().optional(),
});

export type Config = Readonly<{
  gitlabToken: string;
  gitlabHost: string;
  gitlabUserAgent: string;
  logLevel: LogLevel;

  readOnly: boolean;
  enabledTools?: ReadonlySet<string>;
  disabledTools: ReadonlySet<string>;

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

  return {
    gitlabToken: parsed.GITLAB_TOKEN,
    gitlabHost,
    gitlabUserAgent: parsed.GITLAB_USER_AGENT,
    logLevel: parsed.LOG_LEVEL,

    readOnly: parsed.GITLAB_MCP_READ_ONLY,
    enabledTools: parseCsvSet(parsed.GITLAB_MCP_ENABLED_TOOLS),
    disabledTools: parseCsvSet(parsed.GITLAB_MCP_DISABLED_TOOLS) ?? new Set(),
    writeProjectAllowlist: parseCsvSet(parsed.GITLAB_MCP_WRITE_PROJECT_ALLOWLIST),
  };
}
