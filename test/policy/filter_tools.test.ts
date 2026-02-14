import { describe, expect, it } from "vitest";

import { filterTools } from "../../src/policy.js";

describe("filterTools", () => {
  const tools = [
    { name: "read_a", access: "read" },
    { name: "write_b", access: "write" },
    { name: "read_c", access: "read" },
  ] as any[];

  it("returns all tools by default", () => {
    const out = filterTools(tools as any, {
      readOnly: false,
      disabledTools: new Set(),
    } as any);
    expect(out.map((t) => t.name)).toEqual(["read_a", "write_b", "read_c"]);
  });

  it("supports enabledTools allowlist", () => {
    const out = filterTools(tools as any, {
      readOnly: false,
      enabledTools: new Set(["read_c"]),
      disabledTools: new Set(),
    } as any);
    expect(out.map((t) => t.name)).toEqual(["read_c"]);
  });

  it("supports disabledTools denylist", () => {
    const out = filterTools(tools as any, {
      readOnly: false,
      disabledTools: new Set(["write_b"]),
    } as any);
    expect(out.map((t) => t.name)).toEqual(["read_a", "read_c"]);
  });

  it("filters write tools when readOnly=true", () => {
    const out = filterTools(tools as any, {
      readOnly: true,
      disabledTools: new Set(),
    } as any);
    expect(out.map((t) => t.name)).toEqual(["read_a", "read_c"]);
  });

  it("readOnly wins over enabledTools", () => {
    const out = filterTools(tools as any, {
      readOnly: true,
      enabledTools: new Set(["write_b"]),
      disabledTools: new Set(),
    } as any);
    expect(out.map((t) => t.name)).toEqual([]);
  });
});

