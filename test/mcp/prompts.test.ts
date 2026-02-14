import { describe, expect, it } from "vitest";

import { getPrompt, listPrompts } from "../../src/mcp/prompts.js";

describe("mcp prompts", () => {
  it("lists prompts", () => {
    const prompts = listPrompts();
    expect(prompts.some((p) => p.name === "triage_issue")).toBe(true);
  });

  it("requires args for triage_issue", () => {
    expect(() => getPrompt("triage_issue")).toThrow(/project/);
  });

  it("renders triage_issue", () => {
    const p = getPrompt("triage_issue", { project: "group/project", iid: "1" });
    expect(p.messages[0]!.content.text).toContain("group/project#1");
  });
});
