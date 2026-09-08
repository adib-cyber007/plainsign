import { describe, expect, it, vi } from "vitest";
import { log } from "../../../src/lib/log";
describe("log", () => {
  it("uses the PlainSign prefix", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    log("loaded");
    expect(info).toHaveBeenCalledWith("[PlainSign]", "loaded");
    info.mockRestore();
  });
});
