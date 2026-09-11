import { describe, expect, it, vi } from "vitest";

import { simulate } from "../../../src/simulate";
import type { AnalysisRequest } from "../../../src/types";

const from = "0x1111111111111111111111111111111111111111" as const;
const transaction: AnalysisRequest = {
  id: "simulation-index",
  origin: "https://example.com",
  chainId: 11_155_111,
  from,
  request: { method: "eth_sendTransaction", params: [{ from, to: from }] },
};

describe("simulate", () => {
  it("calls Alchemy only for enabled Sepolia transactions with a key", async () => {
    const adapter = vi.fn(async () => ({
      ok: true as const,
      provider: "alchemy" as const,
      changes: [],
    }));
    await expect(
      simulate(transaction, {
        apiKey: "test-key",
        enabled: true,
        simulateWithAlchemy: adapter,
      }),
    ).resolves.toMatchObject({ ok: true, provider: "alchemy" });
    expect(adapter).toHaveBeenCalledOnce();
  });

  it.each([
    ["missing key", transaction, "", true],
    ["disabled", transaction, "test-key", false],
    ["wrong chain", { ...transaction, chainId: 1 }, "test-key", true],
  ])("does not call Alchemy when %s", async (_label, request, apiKey, enabled) => {
    const adapter = vi.fn();
    await expect(
      simulate(request as AnalysisRequest, {
        apiKey,
        enabled,
        simulateWithAlchemy: adapter,
      }),
    ).resolves.toEqual({ ok: false, provider: "none", changes: [] });
    expect(adapter).not.toHaveBeenCalled();
  });
});
