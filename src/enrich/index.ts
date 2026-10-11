import type { Address } from "viem";

import type { AddressInfo } from "../types";
import { getAllowlistEntry } from "./allowlist";
import { getBlockscoutInfo } from "./blockscout";
import { EnrichmentCache } from "./cache";
import { findCommunityDenylistEntry, getCommunityDenylist } from "./denylist";
import { getCode } from "./getCode";

const PER_ADDRESS_TIMEOUT_MS = 1_500;

export interface EnrichDeps {
  cache?: Pick<EnrichmentCache, "get" | "set">;
  getCode?: typeof getCode;
  getBlockscoutInfo?: typeof getBlockscoutInfo;
  getCommunityDenylist?: typeof getCommunityDenylist;
  now?: () => number;
  timeoutMs?: number;
  mock?: boolean;
}

export { collectAddresses } from "./addresses";

export async function enrich(
  addresses: Address[],
  chainId: number,
  _origin: string,
  deps: EnrichDeps = {},
): Promise<Record<string, AddressInfo>> {
  const cache = deps.cache ?? new EnrichmentCache();
  const now = deps.now?.() ?? Date.now();
  const unique = new Map(
    addresses.map((address) => [address.toLowerCase(), address] as const),
  );
  const mock = deps.mock ?? import.meta.env?.VITE_E2E_MOCK_ENRICH === "1";

  const denylistPromise = (
    deps.getCommunityDenylist ?? getCommunityDenylist
  )().catch(() => []);
  const entries = await Promise.all(
    [...unique.values()].map(async (address) => {
      const key = address.toLowerCase();
      const cached = await cache.get(chainId, address, now);
      if (cached) return [key, cached] as const;

      try {
        const info = await withTimeout(
          mock
            ? mockAddressInfo(address, chainId, now)
            : fetchAddressInfo(address, chainId, now, deps),
          deps.timeoutMs ?? PER_ADDRESS_TIMEOUT_MS,
        );
        await cache.set(chainId, info);
        return [key, info] as const;
      } catch {
        // Keep independent denylist evidence even when RPC is unavailable.
        // An absent isContract means unknown, never a confirmed EOA.
        return [key, { address, fetchedAt: now } as AddressInfo] as const;
      }
    }),
  );
  const denylist = await denylistPromise;

  return Object.fromEntries(
    entries.map(([key, info]) => {
      const listed = findCommunityDenylistEntry(
        denylist,
        info.address,
        chainId,
      );
      return [
        key,
        listed
          ? {
              ...info,
              denylisted: { label: listed.label, source: listed.source },
            }
          : info,
      ] as const;
    }),
  );
}

async function fetchAddressInfo(
  address: Address,
  chainId: number,
  now: number,
  deps: EnrichDeps,
): Promise<AddressInfo> {
  const [code, metadata] = await Promise.all([
    (deps.getCode ?? getCode)(address, chainId),
    (deps.getBlockscoutInfo ?? getBlockscoutInfo)(address, chainId).catch(
      () => ({}),
    ),
  ]);
  const allowlisted = getAllowlistEntry(chainId, address);
  return {
    ...metadata,
    address,
    isContract: code !== undefined && code !== "0x",
    ...(allowlisted ? { allowlisted } : {}),
    fetchedAt: now,
  };
}

async function mockAddressInfo(
  address: Address,
  chainId: number,
  now: number,
): Promise<AddressInfo> {
  const allowlisted = getAllowlistEntry(chainId, address);
  return {
    address,
    isContract: !address.toLowerCase().endsWith("aa"),
    ...(allowlisted ? { allowlisted } : {}),
    fetchedAt: now,
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Address enrichment timed out.")),
      timeoutMs,
    );
    void promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
