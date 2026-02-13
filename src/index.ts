import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
import { createGitlabFacade } from "./gitlab/client.js";
import { toPublicError } from "./gitlab/errors.js";
import { createLogger } from "./logger.js";
import { TOOLS } from "./tools/index.js";
import type { ToolContext } from "./tools/types.js";
import { VERSION } from "./version.js";

function asJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const gitlab = createGitlabFacade(config, logger);
  const ctx: ToolContext = { gitlab };

  const server = new Server(
    { name: "gitlab-mcp-server", version: VERSION },
    { capabilities: { tools: {} } },
  );

  const toolByName = new Map(TOOLS.map((t) => [t.name, t]));

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map((t) => ({
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
      return {
        isError: true,
        content: [{ type: "text", text: asJsonText({ error: `Unknown tool: ${name}` }) }],
      };
    }

    try {
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

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server started", { host: config.gitlabHost });
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

