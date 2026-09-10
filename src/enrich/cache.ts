import type { AddressInfo } from "../types";

export const ENRICHMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const CACHE_PREFIX = "plainsign:address:";

export interface CacheStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export class MemoryCacheStore implements CacheStore {
  private readonly values = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.values.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
  }
}

export class ChromeLocalCacheStore implements CacheStore {
  async get(key: string): Promise<unknown> {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  async set(key: string, value: unknown): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }
}

export class EnrichmentCache {
  constructor(
    private readonly store: CacheStore = defaultStore(),
    private readonly ttlMs = ENRICHMENT_CACHE_TTL_MS,
  ) {}

  async get(
    chainId: number,
    address: string,
    now = Date.now(),
  ): Promise<AddressInfo | undefined> {
    try {
      const value = await this.store.get(cacheKey(chainId, address));
      if (!isAddressInfo(value) || now - value.fetchedAt >= this.ttlMs) {
        return undefined;
      }
      return value;
    } catch {
      return undefined;
    }
  }

  async set(chainId: number, info: AddressInfo): Promise<void> {
    try {
      await this.store.set(cacheKey(chainId, info.address), info);
    } catch {
      // Enrichment remains useful when extension storage is unavailable or full.
    }
  }
}

const memoryFallback = new MemoryCacheStore();

function defaultStore(): CacheStore {
  return typeof chrome !== "undefined" && chrome.storage?.local
    ? new ChromeLocalCacheStore()
    : memoryFallback;
}

function cacheKey(chainId: number, address: string): string {
  return `${CACHE_PREFIX}${chainId}:${address.toLowerCase()}`;
}

function isAddressInfo(value: unknown): value is AddressInfo {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<AddressInfo>;
  return (
    typeof record.address === "string" &&
    typeof record.isContract === "boolean" &&
    typeof record.fetchedAt === "number"
  );
}
