import type { Config } from "./config.js";
import type { ToolDef } from "./tools/types.js";

export function filterTools(allTools: ToolDef<any, any>[], config: Config): ToolDef<any, any>[] {
  let tools = allTools.slice();

  if (config.enabledTools) {
    tools = tools.filter((t) => config.enabledTools!.has(t.name));
  }

  if (config.disabledTools.size) {
    tools = tools.filter((t) => !config.disabledTools.has(t.name));
  }

  if (config.readOnly) {
    tools = tools.filter((t) => t.access !== "write");
  }

  return tools;
}

