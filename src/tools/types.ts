import type { z } from "zod";

import type { GitLabFacade } from "../gitlab/client.js";

export type ToolAccess = "read" | "write";

export type ToolPolicy = Readonly<{
  readOnly: boolean;
  writeProjectAllowlist?: ReadonlySet<string>;
}>;

export type ToolContext = Readonly<{
  gitlab: GitLabFacade;
  policy: ToolPolicy;
}>;

export type ToolDef<Schema extends z.ZodTypeAny, Result> = Readonly<{
  name: string;
  description: string;
  access: ToolAccess;
  inputSchema: Record<string, unknown>;
  schema: Schema;
  handler: (args: z.infer<Schema>, ctx: ToolContext) => Promise<Result>;
}>;
