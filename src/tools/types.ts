import type { z } from "zod";

import type { GitLabFacade } from "../gitlab/client.js";

export type ToolContext = Readonly<{
  gitlab: GitLabFacade;
}>;

export type ToolDef<Schema extends z.ZodTypeAny, Result> = Readonly<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  schema: Schema;
  handler: (args: z.infer<Schema>, ctx: ToolContext) => Promise<Result>;
}>;

