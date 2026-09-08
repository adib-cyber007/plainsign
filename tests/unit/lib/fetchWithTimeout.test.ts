import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "../../../src/lib/fetchWithTimeout";
describe("fetchWithTimeout", () => {
  it("returns the fetch response", async () => {
    const response = new Response("ok");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response);
    await expect(fetchWithTimeout("https://example.test")).resolves.toBe(response);
  });
});
