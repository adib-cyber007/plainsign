import { describe, expect, it } from "vitest";

import {
  ENRICHMENT_CACHE_TTL_MS,
  EnrichmentCache,
  MemoryCacheStore,
} from "../../../src/enrich/cache";

const address = "0x1111111111111111111111111111111111111111" as const;

describe("enrichment cache", () => {
  it("returns entries younger than 24 hours and expires older entries", async () => {
    const store = new MemoryCacheStore();
    const cache = new EnrichmentCache(store);
    await cache.set(1, { address, isContract: true, fetchedAt: 1_000 });

    await expect(
      cache.get(1, address, 1_000 + ENRICHMENT_CACHE_TTL_MS - 1),
    ).resolves.toMatchObject({ address });
    await expect(
      cache.get(1, address, 1_000 + ENRICHMENT_CACHE_TTL_MS),
    ).resolves.toBeUndefined();
  });

  it("treats malformed and failing stores as misses", async () => {
    const cache = new EnrichmentCache({
      get: async () => ({ nope: true }),
      set: async () => {
        throw new Error("full");
      },
    });
    await expect(cache.get(1, address)).resolves.toBeUndefined();
    await expect(
      cache.set(1, { address, isContract: false, fetchedAt: 0 }),
    ).resolves.toBeUndefined();
  });
});
