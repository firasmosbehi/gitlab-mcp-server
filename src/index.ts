import { randomUUID } from "node:crypto";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  isInitializeRequest,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { runAuthCli } from "./auth/cli.js";
import { createGitlabFacade } from "./gitlab/client.js";
import { toPublicError } from "./gitlab/errors.js";
import { createLogger } from "./logger.js";
import { listPrompts, getPrompt } from "./mcp/prompts.js";
import {
  listGitlabResources,
  listGitlabResourceTemplates,
  readGitlabResource,
} from "./mcp/resources.js";
import { filterTools } from "./policy.js";
import { TOOLS } from "./tools/index.js";
import type { ToolContext } from "./tools/types.js";
import { VERSION } from "./version.js";

function asJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseLogLevelEnv(value: unknown): "error" | "warn" | "info" | "debug" {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "error" || v === "warn" || v === "info" || v === "debug") return v;
  return "info";
}

function serverUsage(): string {
  return [
    "gitlab-mcp-server",
    "",
    "Modes:",
    "  stdio (default)  MCP over stdio (best for local clients)",
    "  http             MCP Streamable HTTP transport (best for remote deployments)",
    "",
    "Common flags (override env vars):",
    "  --transport <stdio|http>       (GITLAB_MCP_TRANSPORT)",
    "  --http-host <host>             (GITLAB_MCP_HTTP_HOST)",
    "  --http-port <port>             (GITLAB_MCP_HTTP_PORT)",
    "  --http-path <path>             (GITLAB_MCP_HTTP_PATH)",
    "  --http-allowed-hosts <csv>     (GITLAB_MCP_HTTP_ALLOWED_HOSTS)",
    "  --http-stateful                (GITLAB_MCP_HTTP_STATEFUL=true)",
    "  --http-stateless               (GITLAB_MCP_HTTP_STATEFUL=false)",
    "  --http-max-sessions <n>        (GITLAB_MCP_HTTP_MAX_SESSIONS)",
    "  --http-bearer-token <token>    (GITLAB_MCP_HTTP_BEARER_TOKEN)",
    "",
    "Other commands:",
    "  gitlab-mcp-server auth ...",
    "",
  ].join("\n");
}

function parseServerArgOverrides(argv: string[]): Readonly<{
  showHelp: boolean;
  showVersion: boolean;
  overrides: Record<string, string>;
}> {
  const overrides: Record<string, string> = {};
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i] ?? "";
    if (a === "--help" || a === "-h") {
      showHelp = true;
      continue;
    }
    if (a === "--version" || a === "-v") {
      showVersion = true;
      continue;
    }

    const [flag, inlineValue] = a.startsWith("--") ? a.split("=", 2) : [a, undefined];
    const next = argv[i + 1];
    const value = inlineValue ?? (next && !next.startsWith("-") ? next : undefined);
    const consumeNext = inlineValue === undefined && value !== undefined && value === next;

    const set = (key: string, v: string) => {
      overrides[key] = v;
      if (consumeNext) i += 1;
    };

    if (flag === "--transport" && value) {
      set("GITLAB_MCP_TRANSPORT", value);
      continue;
    }
    if (flag === "--http-host" && value) {
      set("GITLAB_MCP_HTTP_HOST", value);
      continue;
    }
    if (flag === "--http-port" && value) {
      set("GITLAB_MCP_HTTP_PORT", value);
      continue;
    }
    if (flag === "--http-path" && value) {
      set("GITLAB_MCP_HTTP_PATH", value);
      continue;
    }
    if (flag === "--http-allowed-hosts" && value) {
      set("GITLAB_MCP_HTTP_ALLOWED_HOSTS", value);
      continue;
    }
    if (flag === "--http-stateful") {
      overrides.GITLAB_MCP_HTTP_STATEFUL = "true";
      continue;
    }
    if (flag === "--http-stateless") {
      overrides.GITLAB_MCP_HTTP_STATEFUL = "false";
      continue;
    }
    if (flag === "--http-max-sessions" && value) {
      set("GITLAB_MCP_HTTP_MAX_SESSIONS", value);
      continue;
    }
    if (flag === "--http-bearer-token" && value) {
      set("GITLAB_MCP_HTTP_BEARER_TOKEN", value);
      continue;
    }
  }

  return { showHelp, showVersion, overrides };
}

function createMcpServer(params: {
  config: ReturnType<typeof loadConfig>;
  logger: ReturnType<typeof createLogger>;
  ctx: ToolContext;
  enabledTools: typeof TOOLS;
  allTools: typeof TOOLS;
}): Server {
  const { config, logger, ctx, enabledTools, allTools } = params;

  const server = new Server(
    { name: "gitlab-mcp-server", version: VERSION },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  const allToolByName = new Map(allTools.map((t) => [t.name, t]));
  const toolByName = new Map(enabledTools.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: enabledTools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const tool = toolByName.get(name);

    if (!tool) {
      if (allToolByName.has(name)) {
        return {
          isError: true,
          content: [{ type: "text", text: asJsonText({ error: `Tool disabled by policy: ${name}` }) }],
        };
      }
      return {
        isError: true,
        content: [{ type: "text", text: asJsonText({ error: `Unknown tool: ${name}` }) }],
      };
    }

    try {
      if (config.readOnly && tool.access === "write") {
        throw new Error("Write tools are disabled: server is running in read-only mode.");
      }
      const args = tool.schema.parse(request.params.arguments ?? {});
      const result = await tool.handler(args as any, ctx);
      return { content: [{ type: "text", text: asJsonText(result) }] };
    } catch (err) {
      const pub = toPublicError(err);
      return {
        isError: true,
        content: [{ type: "text", text: asJsonText({ error: pub.message, status: pub.status }) }],
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: listGitlabResources() };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return { resourceTemplates: listGitlabResourceTemplates() };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      const contents = await readGitlabResource(request.params.uri, ctx);
      return { contents };
    } catch (err) {
      const pub = toPublicError(err);
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "text/plain",
            text: asJsonText({ error: pub.message, status: pub.status }),
          },
        ],
      };
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: listPrompts() };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const p = getPrompt(request.params.name, request.params.arguments);
    return {
      description: p.description,
      messages: p.messages.map((m) => ({ role: m.role, content: [m.content] })),
    };
  });

  const allNames = new Set(allTools.map((t) => t.name));
  if (config.enabledTools) {
    for (const name of config.enabledTools) {
      if (!allNames.has(name)) logger.warn("Unknown tool in GITLAB_MCP_ENABLED_TOOLS", { name });
    }
  }
  for (const name of config.disabledTools) {
    if (!allNames.has(name)) logger.warn("Unknown tool in GITLAB_MCP_DISABLED_TOOLS", { name });
  }

  return server;
}

async function runStdioServer(params: {
  config: ReturnType<typeof loadConfig>;
  logger: ReturnType<typeof createLogger>;
  ctx: ToolContext;
  enabledTools: typeof TOOLS;
  allTools: typeof TOOLS;
}): Promise<void> {
  const { config, logger, ctx, enabledTools, allTools } = params;

  const server = createMcpServer({ config, logger, ctx, enabledTools, allTools });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server started (stdio)", {
    host: config.gitlabHost,
    readOnly: config.readOnly,
    tools: enabledTools.length,
  });
}

async function runHttpServer(params: {
  config: ReturnType<typeof loadConfig>;
  logger: ReturnType<typeof createLogger>;
  ctx: ToolContext;
  enabledTools: typeof TOOLS;
  allTools: typeof TOOLS;
}): Promise<void> {
  const { config, logger, ctx, enabledTools, allTools } = params;

  const allowedHosts = config.httpAllowedHosts ? Array.from(config.httpAllowedHosts) : undefined;
  const app = createMcpExpressApp({ host: config.httpHost, allowedHosts });

  // Optional bearer auth for remote deployments.
  const requireBearer = (req: any, res: any, next: any) => {
    const expected = config.httpBearerToken;
    if (!expected) return next();
    const auth = String(req.headers?.authorization ?? "");
    if (auth === `Bearer ${expected}`) return next();
    res.status(401).json({ error: "Unauthorized" });
  };

  type Session = Readonly<{ transport: StreamableHTTPServerTransport; server: Server }>;
  const sessions = new Map<string, Session>();

  function evictIfNeeded(): void {
    if (sessions.size < config.httpMaxSessions) return;
    const firstKey = sessions.keys().next().value as string | undefined;
    if (!firstKey) return;
    const s = sessions.get(firstKey);
    sessions.delete(firstKey);
    s?.transport.close().catch(() => undefined);
    logger.warn("Evicted oldest MCP HTTP session (max sessions reached)", {
      maxSessions: config.httpMaxSessions,
    });
  }

  const mcpPostHandler = async (req: any, res: any) => {
    try {
      if (!config.httpStateful) {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
        const server = createMcpServer({ config, logger, ctx, enabledTools, allTools });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      const sessionId = String(req.headers?.["mcp-session-id"] ?? "");
      if (sessionId && sessions.has(sessionId)) {
        const s = sessions.get(sessionId)!;
        await s.transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        evictIfNeeded();

        const server = createMcpServer({ config, logger, ctx, enabledTools, allTools });
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            sessions.set(sid, { transport, server });
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid) sessions.delete(sid);
        };

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null,
      });
    } catch (err) {
      logger.error("Error handling MCP HTTP request", { message: String((err as any)?.message ?? err) });
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  };

  const mcpGetHandler = async (req: any, res: any) => {
    if (!config.httpStateful) {
      res.status(400).send("Stateless mode does not support GET SSE streams.");
      return;
    }
    const sessionId = String(req.headers?.["mcp-session-id"] ?? "");
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    const s = sessions.get(sessionId)!;
    await s.transport.handleRequest(req, res);
  };

  const mcpDeleteHandler = async (req: any, res: any) => {
    if (!config.httpStateful) {
      res.status(400).send("Stateless mode does not support session termination.");
      return;
    }
    const sessionId = String(req.headers?.["mcp-session-id"] ?? "");
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }
    const s = sessions.get(sessionId)!;
    await s.transport.handleRequest(req, res);
  };

  app.post(config.httpPath, requireBearer, mcpPostHandler);
  app.get(config.httpPath, requireBearer, mcpGetHandler);
  app.delete(config.httpPath, requireBearer, mcpDeleteHandler);

  const httpServer = app.listen(config.httpPort, config.httpHost, () => {
    logger.info("MCP server started (http)", {
      bind: `${config.httpHost}:${config.httpPort}`,
      path: config.httpPath,
      stateful: config.httpStateful,
      maxSessions: config.httpMaxSessions,
    });
  });

  httpServer.on("error", (err: any) => {
    logger.error("Failed to start HTTP server", { message: String(err?.message ?? err) });
    process.exit(1);
  });

  process.on("SIGINT", async () => {
    logger.info("Shutting down HTTP server...");
    for (const [sid, s] of sessions) {
      try {
        await s.transport.close();
      } catch {
        // ignore
      } finally {
        sessions.delete(sid);
      }
    }
    httpServer.close();
    process.exit(0);
  });
}

async function main() {
  if (process.argv[2] === "auth") {
    const logger = createLogger(parseLogLevelEnv(process.env.LOG_LEVEL));
    await runAuthCli(process.argv.slice(3), process.env, logger);
    return;
  }

  const argParsed = parseServerArgOverrides(process.argv.slice(2));
  if (argParsed.showVersion) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (argParsed.showHelp) {
    process.stdout.write(`${serverUsage()}\n`);
    return;
  }

  const mergedEnv = { ...(process.env as any), ...argParsed.overrides } as NodeJS.ProcessEnv;
  const config = loadConfig(mergedEnv);
  const logger = createLogger(config.logLevel);

  const gitlab = createGitlabFacade(config, logger);
  const ctx: ToolContext = {
    gitlab,
    policy: {
      readOnly: config.readOnly,
      writeProjectAllowlist: config.writeProjectAllowlist,
    },
  };

  const allTools = TOOLS;
  const enabledTools = filterTools(allTools, config);

  if (config.transport === "http") {
    await runHttpServer({ config, logger, ctx, enabledTools, allTools });
  } else {
    await runStdioServer({ config, logger, ctx, enabledTools, allTools });
  }
}

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[gitlab-mcp-server] error: unhandledRejection ${String(reason)}\n`);
  process.exitCode = 1;
});

process.on("uncaughtException", (err) => {
  process.stderr.write(`[gitlab-mcp-server] error: uncaughtException ${String(err?.message ?? err)}\n`);
  process.exitCode = 1;
});

main().catch((err) => {
  process.stderr.write(`[gitlab-mcp-server] error: failed to start ${String(err?.message ?? err)}\n`);
  process.exit(1);
});
