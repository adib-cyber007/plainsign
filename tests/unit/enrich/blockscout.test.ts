import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getBlockscoutInfo } from "../../../src/enrich/blockscout";

const weth = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as const;

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(resolve("tests", "fixtures", "enrich", name), "utf8"),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("getBlockscoutInfo", () => {
  it("maps recorded Sepolia address and creation transaction responses", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(fixture("blockscout-address-weth-sepolia.json"))),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify(fixture("blockscout-transaction-weth-sepolia.json")),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getBlockscoutInfo(weth, 11155111, {
        now: () => Date.parse("2023-05-22T16:41:24.000Z"),
      }),
    ).resolves.toEqual({
      isVerified: true,
      contractName: "Wrapped Ether",
      ageDays: 3,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL(`https://eth-sepolia.blockscout.com/api/v2/addresses/${weth}`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL(
        "https://eth-sepolia.blockscout.com/api/v2/transactions/0xa02b133950b74105c7f7b7fe2c008e38fc601b6d3ac1ef3a900fdd0fc2002f3a",
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("does not call Blockscout for a chain without a configured base", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    await expect(getBlockscoutInfo(weth, 31337)).resolves.toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aborts a slow request after 1500 ms", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
      ),
    );
    const pending = getBlockscoutInfo(weth, 11155111);
    const rejected = expect(pending).rejects.toBeInstanceOf(DOMException);
    await vi.advanceTimersByTimeAsync(1_501);
    await rejected;
  });
});
