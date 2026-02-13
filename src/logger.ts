import type { LogLevel } from "./config.js";

const LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export type Logger = Readonly<{
  error: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  info: (msg: string, meta?: unknown) => void;
  debug: (msg: string, meta?: unknown) => void;
}>;

function formatMeta(meta: unknown): string {
  if (meta === undefined) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [meta_unserializable]";
  }
}

export function createLogger(level: LogLevel): Logger {
  const min = LEVELS[level];

  function log(lvl: LogLevel, msg: string, meta?: unknown) {
    if (LEVELS[lvl] > min) return;
    // MCP uses stdout for JSON-RPC; keep logs on stderr.
    process.stderr.write(`[gitlab-mcp-server] ${lvl}: ${msg}${formatMeta(meta)}\n`);
  }

  return {
    error: (msg, meta) => log("error", msg, meta),
    warn: (msg, meta) => log("warn", msg, meta),
    info: (msg, meta) => log("info", msg, meta),
    debug: (msg, meta) => log("debug", msg, meta),
  };
}

