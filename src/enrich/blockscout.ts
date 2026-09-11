import type { Address } from "viem";

import { getChainConfig } from "../config/chains";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import type { AddressInfo } from "../types";

const BLOCKSCOUT_TIMEOUT_MS = 1_500;
const DAY_MS = 86_400_000;

interface BlockscoutAddressResponse {
  is_verified?: unknown;
  name?: unknown;
  creation_tx_hash?: unknown;
  creation_transaction_hash?: unknown;
}

interface BlockscoutTransactionResponse {
  timestamp?: unknown;
}

export interface BlockscoutDeps {
  now?: () => number;
  timeoutMs?: number;
}

export async function getBlockscoutInfo(
  address: Address,
  chainId: number,
  deps: BlockscoutDeps = {},
): Promise<Partial<AddressInfo>> {
  const baseUrl = getChainConfig(chainId)?.blockscoutBaseUrl;
  if (!baseUrl) return {};

  const addressPayload = await getJson<BlockscoutAddressResponse>(
    new URL(`addresses/${address}`, baseUrl),
    deps.timeoutMs ?? BLOCKSCOUT_TIMEOUT_MS,
  );
  const result: Partial<AddressInfo> = {};

  if (typeof addressPayload.is_verified === "boolean") {
    result.isVerified = addressPayload.is_verified;
  }
  if (typeof addressPayload.name === "string" && addressPayload.name.trim()) {
    result.contractName = addressPayload.name.trim();
  }

  const creationHash = stringValue(
    addressPayload.creation_tx_hash ??
      addressPayload.creation_transaction_hash,
  );
  if (!creationHash) return result;

  const transactionPayload = await getJson<BlockscoutTransactionResponse>(
    new URL(`transactions/${creationHash}`, baseUrl),
    deps.timeoutMs ?? BLOCKSCOUT_TIMEOUT_MS,
  );
  const createdAt = timestampMs(transactionPayload.timestamp);
  if (createdAt !== undefined) {
    const now = deps.now?.() ?? Date.now();
    result.ageDays = Math.max(0, Math.floor((now - createdAt) / DAY_MS));
  }

  return result;
}

async function getJson<T>(url: URL, timeoutMs: number): Promise<T> {
  const response = await fetchWithTimeout(
    url,
    { headers: { accept: "application/json" } },
    timeoutMs,
  );
  if (!response.ok) {
    throw new Error(`Blockscout returned HTTP ${response.status}.`);
  }
  return (await response.json()) as T;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function timestampMs(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const parsed =
    typeof value === "number" ? value * 1_000 : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
