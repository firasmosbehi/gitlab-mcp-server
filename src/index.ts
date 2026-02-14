import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfig } from "./config.js";
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

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const gitlab = createGitlabFacade(config, logger);
  const ctx: ToolContext = {
    gitlab,
    policy: {
      readOnly: config.readOnly,
      writeProjectAllowlist: config.writeProjectAllowlist,
    },
  };

  const server = new Server(
    { name: "gitlab-mcp-server", version: VERSION },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  const allTools = TOOLS;
  const enabledTools = filterTools(allTools, config);

  const allToolByName = new Map(allTools.map((t) => [t.name, t]));
  const toolByName = new Map(enabledTools.map((t) => [t.name, t]));

  const allNames = new Set(allTools.map((t) => t.name));
  if (config.enabledTools) {
    for (const name of config.enabledTools) {
      if (!allNames.has(name)) logger.warn("Unknown tool in GITLAB_MCP_ENABLED_TOOLS", { name });
    }
  }
  for (const name of config.disabledTools) {
    if (!allNames.has(name)) logger.warn("Unknown tool in GITLAB_MCP_DISABLED_TOOLS", { name });
  }

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

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server started", {
    host: config.gitlabHost,
    readOnly: config.readOnly,
    tools: enabledTools.length,
  });
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
