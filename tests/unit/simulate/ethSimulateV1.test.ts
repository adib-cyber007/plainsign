import { describe, expect, it } from "vitest";

import liveWeth from "../../fixtures/simulate/eth-simulate-v1-weth-deposit-sepolia-live.json";
import { transactionForSimulation } from "../../../src/simulate/defaults";
import { simulationFromEthSimulateV1 } from "../../../src/simulate/ethSimulateV1";
import type { AnalysisRequest } from "../../../src/types";

const from = "0x58F678D1cbCea837821EF615985fa12C4a638132" as const;
const request: AnalysisRequest = {
  id: "eth-simulate-v1",
  origin: "https://example.com",
  chainId: 11_155_111,
  from,
  request: {
    method: "eth_sendTransaction",
    params: [liveWeth.request.transaction],
  },
};

describe("eth_simulateV1 fallback mapping", () => {
  it("maps a successful live WETH deposit from simulated logs", () => {
    const transaction = transactionForSimulation(request)!;
    expect(
      simulationFromEthSimulateV1(liveWeth.response, request, transaction),
    ).toEqual({
      ok: true,
      provider: "alchemy",
      changes: [
        {
          kind: "native",
          symbol: "ETH",
          delta: -10_000_000_000_000_000n,
          formatted: "-0.01 ETH",
        },
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
  });

  it("returns a reverted result when the simulated call fails", () => {
    const transaction = transactionForSimulation(request)!;
    const payload = {
      result: [{ calls: [{ status: "0x0", logs: [] }] }],
    };
    expect(simulationFromEthSimulateV1(payload, request, transaction)).toEqual({
      ok: false,
      provider: "alchemy",
      reverted: true,
      revertReason: "Simulation reverted.",
      changes: [],
    });
  });
});
