import { describe, expect, it } from "vitest";

import { assertWriteAllowed } from "../../src/tools/write_guard.js";

describe("assertWriteAllowed", () => {
  it("blocks writes in read-only mode", () => {
    const ctx = {
      policy: { readOnly: true },
    } as any;

    expect(() => assertWriteAllowed(ctx, "group/project")).toThrow(/read-only/);
  });

  it("blocks writes outside allowlist", () => {
    const ctx = {
      policy: { readOnly: false, writeProjectAllowlist: new Set(["allowed/project"]) },
    } as any;

    expect(() => assertWriteAllowed(ctx, "other/project")).toThrow(/allowlist/i);
  });

  it("allows writes within allowlist", () => {
    const ctx = {
      policy: { readOnly: false, writeProjectAllowlist: new Set(["allowed/project"]) },
    } as any;

    expect(() => assertWriteAllowed(ctx, "allowed/project")).not.toThrow();
  });
});
