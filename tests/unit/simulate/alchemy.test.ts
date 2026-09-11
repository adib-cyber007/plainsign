import { describe, expect, it, vi } from "vitest";

import documentedWeth from "../../fixtures/simulate/alchemy-weth-deposit-documented.json";
import ethSimulateWeth from "../../fixtures/simulate/eth-simulate-v1-weth-deposit-sepolia-live.json";
import liveOverBalance from "../../fixtures/simulate/alchemy-over-balance-sepolia-live.json";
import liveWeth from "../../fixtures/simulate/alchemy-weth-deposit-sepolia-live.json";
import { fetchWithTimeout } from "../../../src/lib/fetchWithTimeout";
import { simulateWithAlchemy } from "../../../src/simulate/alchemy";
import type { AnalysisRequest } from "../../../src/types";

const from = "0x58F678D1cbCea837821EF615985fa12C4a638132" as const;
const weth = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14" as const;

function request(): AnalysisRequest {
  return {
    id: "weth-deposit",
    origin: "https://example.com",
    chainId: 11_155_111,
    from,
    request: {
      method: "eth_sendTransaction",
      params: [
        { from, to: weth, data: "0xd0e30db0", value: "0x2386f26fc10000", nonce: "0x9" },
      ],
    },
  };
}

function response(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("simulateWithAlchemy", () => {
  it("maps documented WETH changes from the requesting account's perspective", async () => {
    const fetchMock = vi.fn<typeof fetchWithTimeout>();
    fetchMock.mockImplementation(async (_input, init) => {
      const method = JSON.parse(String(init?.body)).method;
      return response(
        method === "alchemy_simulateAssetChanges"
          ? documentedWeth
          : { jsonrpc: "2.0", id: 2, error: { code: -32601 } },
      );
    });
    const original = request();
    const result = await simulateWithAlchemy(original, "test-key", { fetch: fetchMock });

    expect(result).toEqual({
      ok: true,
      provider: "alchemy",
      changes: [
        { kind: "native", symbol: "ETH", delta: -10_000_000_000_000_000n, formatted: "-0.01 ETH" },
        {
          kind: "erc20",
          token: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
          symbol: "WETH",
          decimals: 18,
          delta: 10_000_000_000_000_000n,
          formatted: "+0.01 WETH",
        },
      ],
    });
    const primaryCall = fetchMock.mock.calls.find(([, init]) =>
      String(init?.body).includes("alchemy_simulateAssetChanges"),
    );
    const [, init, timeout] = primaryCall!;
    expect(timeout).toBe(2_500);
    const body = JSON.parse(String(init?.body));
    expect(body.method).toBe("alchemy_simulateAssetChanges");
    expect(body.params[0]).toMatchObject({ gas: "0x1e8480", value: "0x2386f26fc10000" });
    expect(body.params[0]).not.toHaveProperty("nonce");
    expect((original.request.params[0] as Record<string, unknown>).nonce).toBe("0x9");
  });

  it("falls back to eth_simulateV1 for Alchemy's recorded bigInt failure", async () => {
    const fetchMock = vi.fn<typeof fetchWithTimeout>();
    fetchMock.mockImplementation(async (_input, init) => {
      const method = JSON.parse(String(init?.body)).method;
      return response(
        method === "eth_simulateV1"
          ? ethSimulateWeth.response
          : liveWeth.response,
      );
    });

    const result = await simulateWithAlchemy(request(), "test-key", {
      fetch: fetchMock,
    });

    expect(result.changes.map((change) => change.formatted)).toEqual([
      "-0.01 ETH",
      "+0.01 WETH",
    ]);
    expect(result).toMatchObject({ ok: true, provider: "alchemy" });
    const fallbackCall = fetchMock.mock.calls.find(([, init]) =>
      String(init?.body).includes("eth_simulateV1"),
    );
    const fallbackBody = JSON.parse(String(fallbackCall?.[1]?.body));
    expect(fallbackBody.method).toBe("eth_simulateV1");
    expect(fallbackBody.params[0].blockStateCalls[0]).toMatchObject({
      traceTransfers: true,
      validation: false,
    });
  });

  it("degrades safely for the recorded over-balance response", async () => {
    const result = await simulateWithAlchemy(request(), "test-key", {
      fetch: async () => response(liveOverBalance.response),
    });
    expect(result).toMatchObject({ ok: false, provider: "none", changes: [] });
    expect(result.error).toContain("insufficient funds");
  });

  it("marks a simulated execution error as reverted", async () => {
    const result = await simulateWithAlchemy(request(), "test-key", {
      fetch: async () =>
        response({ jsonrpc: "2.0", id: 1, result: { changes: [], error: "execution reverted" } }),
    });
    expect(result).toEqual({
      ok: false,
      provider: "alchemy",
      reverted: true,
      revertReason: "execution reverted",
      changes: [],
    });
  });

  it("never throws on timeouts or malformed responses", async () => {
    const result = await simulateWithAlchemy(request(), "test-key", {
      fetch: async () => {
        throw new DOMException("Request timed out", "TimeoutError");
      },
    });
    expect(result).toMatchObject({ ok: false, provider: "none", changes: [] });
    expect(result.error).toContain("timed out");
  });
});
