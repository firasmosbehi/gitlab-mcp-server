import type { ToolContext } from "./types.js";

export function assertWriteAllowed(ctx: ToolContext, project: string): void {
  if (ctx.policy.readOnly) {
    throw new Error("Write tools are disabled: server is running in read-only mode.");
  }

  const allowlist = ctx.policy.writeProjectAllowlist;
  if (allowlist && !allowlist.has(project)) {
    throw new Error(
      `Write is not permitted for project '${project}': not in GITLAB_MCP_WRITE_PROJECT_ALLOWLIST.`,
    );
  }
}

