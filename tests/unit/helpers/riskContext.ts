import type { Address } from "viem";

import type { AddressInfo, Intent, RiskContext } from "../../../src/types";

export const ACCOUNT = "0x1111111111111111111111111111111111111111" as Address;
export const TARGET = "0x2222222222222222222222222222222222222222" as Address;

export function riskContext(
  intent: Partial<Intent> = {},
  options: {
    info?: Partial<AddressInfo>;
    origin?: string;
    changes?: RiskContext["simulation"]["changes"];
    reverted?: boolean;
  } = {},
): RiskContext {
  const fullIntent: Intent = {
    kind: "native_transfer",
    method: "eth_sendTransaction",
    to: TARGET,
    raw: {},
    ...intent,
  };
  return {
    request: {
      id: "test",
      origin: options.origin ?? "https://example.com",
      chainId: 11155111,
      from: ACCOUNT,
      request: { method: fullIntent.method, params: [] },
    },
    intent: fullIntent,
    simulation: {
      ok: !options.reverted,
      reverted: options.reverted,
      changes: options.changes ?? [],
      provider: "none",
    },
    addresses: {
      [TARGET.toLowerCase()]: {
        address: TARGET,
        isContract: true,
        isVerified: true,
        fetchedAt: 0,
        ...options.info,
      },
    },
    now: 1_800_000_000,
  };
}
