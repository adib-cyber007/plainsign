import { describe, expect, it } from "vitest";
import { formatAmount, formatNative } from "../../../src/lib/format";
describe("format helpers", () => {
  it("formats units", () => {
    expect(formatAmount(1_234_500n, 6)).toBe("1.2345");
    expect(formatNative(10_000_000_000_000_000n)).toBe("0.01");
  });
});
