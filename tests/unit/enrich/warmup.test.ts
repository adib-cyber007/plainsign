import { describe, expect, it, vi } from "vitest";

import { warmAllowlistedAddresses } from "../../../src/enrich/warmup";

const weth = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81" as const;

describe("allowlist warm-up", () => {
  it("warms every Sepolia allowlisted address on install", async () => {
    const enrich = vi.fn(async () => ({}));

    await warmAllowlistedAddresses({
      getAllowlistedAddresses: () => [weth],
      enrich,
    });

    expect(enrich).toHaveBeenCalledWith(
      [weth],
      11_155_111,
      "chrome-extension://plainsign-warmup",
    );
  });

  it("is opportunistic and never rejects installation", async () => {
    await expect(
      warmAllowlistedAddresses({
        getAllowlistedAddresses: () => [weth],
        enrich: async () => {
          throw new Error("offline");
        },
      }),
    ).resolves.toBeUndefined();
  });
});
