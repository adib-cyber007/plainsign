import { describe, expect, it } from "vitest";
import { shortAddr } from "../../../src/lib/shortAddr";
describe("shortAddr", () => {
  it("shortens an address", () => {
    expect(shortAddr("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });
});
