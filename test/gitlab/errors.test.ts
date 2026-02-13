import { describe, expect, it } from "vitest";

import { toPublicError } from "../../src/gitlab/errors.js";

describe("toPublicError", () => {
  it("maps 401", () => {
    const e = { response: { status: 401 } };
    expect(toPublicError(e).message).toMatch(/Unauthorized/);
  });

  it("maps 404", () => {
    const e = { response: { status: 404 } };
    expect(toPublicError(e).message).toMatch(/Not found/);
  });
});

