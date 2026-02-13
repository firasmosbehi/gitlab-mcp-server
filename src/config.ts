import { z } from "zod";

import { VERSION } from "./version.js";

const LogLevelSchema = z.enum(["error", "warn", "info", "debug"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

const EnvSchema = z.object({
  GITLAB_TOKEN: z.string().min(1, "GITLAB_TOKEN is required"),
  GITLAB_HOST: z.string().url().default("https://gitlab.com"),
  GITLAB_USER_AGENT: z
    .string()
    .min(1)
    .default(`gitlab-mcp-server/${VERSION}`),
  LOG_LEVEL: LogLevelSchema.default("info"),
});

export type Config = Readonly<{
  gitlabToken: string;
  gitlabHost: string;
  gitlabUserAgent: string;
  logLevel: LogLevel;
}>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.parse(env);

  return {
    gitlabToken: parsed.GITLAB_TOKEN,
    gitlabHost: parsed.GITLAB_HOST.replace(/\/+$/, ""),
    gitlabUserAgent: parsed.GITLAB_USER_AGENT,
    logLevel: parsed.LOG_LEVEL,
  };
}

