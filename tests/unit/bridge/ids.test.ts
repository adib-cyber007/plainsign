import { describe, expect, it } from "vitest";

import { createId } from "../../../src/bridge/ids";

describe("createId", () => {
  it("creates unique UUIDs", () => {
    const first = createId();
    const second = createId();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(second).not.toBe(first);
  });
});
