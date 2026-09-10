import { describe, expect, it, vi } from "vitest";

import { collectAddresses, enrich } from "../../../src/enrich";
import type { AddressInfo, Intent } from "../../../src/types";

const one = "0x1111111111111111111111111111111111111111" as const;
const two = "0x2222222222222222222222222222222222222222" as const;
const three = "0x3333333333333333333333333333333333333333" as const;

describe("enrich", () => {
  it("collects every relevant address recursively and deduplicates", () => {
    const intent: Intent = {
      kind: "multicall",
      method: "eth_sendTransaction",
      to: one,
      token: two,
      children: [
        {
          kind: "erc20_approve",
          method: "eth_sendTransaction",
          to: one,
          spender: three,
          token: two,
          raw: {},
        },
      ],
      raw: {},
    };
    expect(collectAddresses(intent)).toEqual([one, two, three]);
  });

  it("uses cached results and fetches uncached addresses without network", async () => {
    const cached: AddressInfo = {
      address: one,
      isContract: true,
      fetchedAt: 10,
    };
    const cache = {
      get: vi.fn(async (_chain: number, address: string) =>
        address === one ? cached : undefined,
      ),
      set: vi.fn(async () => undefined),
    };
    const code = vi.fn(async () => undefined);
    const result = await enrich([one, two], 31337, "http://localhost", {
      cache,
      getCode: code,
      getBlockscoutInfo: async () => ({ contractName: "Local target" }),
      now: () => 20,
    });

    expect(result[one]).toBe(cached);
    expect(result[two]).toMatchObject({
      address: two,
      isContract: false,
      contractName: "Local target",
      fetchedAt: 20,
    });
    expect(code).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);
  });

  it("keeps successful partial results when another address fails or times out", async () => {
    const result = await enrich([one, two, three], 31337, "http://localhost", {
      cache: { get: async () => undefined, set: async () => undefined },
      getCode: async (address) => {
        if (address === two) throw new Error("RPC down");
        if (address === three) return new Promise(() => undefined);
        return "0x6000";
      },
      getBlockscoutInfo: async () => ({}),
      timeoutMs: 5,
    });
    expect(Object.keys(result)).toEqual([one]);
    expect(result[one].isContract).toBe(true);
  });

  it("uses deterministic aa/cc address classes in E2E mock mode", async () => {
    const eoa = `0x${"1".repeat(38)}aa` as const;
    const contract = `0x${"2".repeat(38)}cc` as const;
    const result = await enrich([eoa, contract], 31337, "http://localhost", {
      cache: { get: async () => undefined, set: async () => undefined },
      mock: true,
    });
    expect(result[eoa].isContract).toBe(false);
    expect(result[contract].isContract).toBe(true);
  });
});
