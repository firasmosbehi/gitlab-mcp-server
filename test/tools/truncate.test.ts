import { describe, expect, it } from "vitest";

import { truncateText } from "../../src/tools/common.js";

describe("truncateText", () => {
  it("does not truncate when below limit", () => {
    const out = truncateText("abc", 10);
    expect(out.truncated).toBe(false);
    expect(out.text).toBe("abc");
  });

  it("truncates and adds marker", () => {
    const out = truncateText("a".repeat(20), 5);
    expect(out.truncated).toBe(true);
    expect(out.text).toContain("[truncated:");
  });
});

