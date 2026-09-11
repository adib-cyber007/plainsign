import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIMULATION_GAS,
  DEFAULT_SIMULATION_VALUE,
  transactionForSimulation,
} from "../../../src/simulate/defaults";
import type { AnalysisRequest } from "../../../src/types";

const from = "0x1111111111111111111111111111111111111111" as const;

describe("transactionForSimulation", () => {
  it("fills defaults, omits nonce, and does not mutate the wallet request", () => {
    const transaction = { from, to: from, nonce: "0x7", data: "0x1234" };
    const request: AnalysisRequest = {
      id: "defaults",
      origin: "https://example.com",
      chainId: 11_155_111,
      from,
      request: { method: "eth_sendTransaction", params: [transaction] },
    };

    expect(transactionForSimulation(request)).toEqual({
      from,
      to: from,
      data: "0x1234",
      gas: DEFAULT_SIMULATION_GAS,
      value: DEFAULT_SIMULATION_VALUE,
    });
    expect(transaction).toHaveProperty("nonce", "0x7");
    expect(transaction).not.toHaveProperty("gas");
  });

  it("does not simulate signatures", () => {
    const request: AnalysisRequest = {
      id: "signature",
      origin: "https://example.com",
      chainId: 11_155_111,
      from,
      request: { method: "personal_sign", params: ["hello", from] },
    };
    expect(transactionForSimulation(request)).toBeUndefined();
  });
});
