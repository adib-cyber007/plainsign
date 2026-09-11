import { formatUnits, getAddress, isAddress, parseUnits, type Address } from "viem";

import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import type { AnalysisRequest, AssetChange, SimulationResult } from "../types";
import {
  ALCHEMY_SIMULATION_TIMEOUT_MS,
  transactionForSimulation,
  type SimulationTransaction,
} from "./defaults";
import { simulationFromEthSimulateV1 } from "./ethSimulateV1";

interface AlchemyChange {
  assetType?: unknown;
  changeType?: unknown;
  from?: unknown;
  to?: unknown;
  rawAmount?: unknown;
  amount?: unknown;
  contractAddress?: unknown;
  decimals?: unknown;
  symbol?: unknown;
  tokenId?: unknown;
}

interface AlchemyPayload {
  result?: { changes?: unknown; error?: unknown };
  error?: { code?: unknown; message?: unknown };
}

export interface AlchemySimulationDeps {
  fetch?: typeof fetchWithTimeout;
  timeoutMs?: number;
}

export async function simulateWithAlchemy(
  request: AnalysisRequest,
  apiKey: string,
  deps: AlchemySimulationDeps = {},
): Promise<SimulationResult> {
  const transaction = transactionForSimulation(request);
  if (!transaction) return unavailable("Request is not a transaction.");
  const endpoint = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
  const timeoutMs = deps.timeoutMs ?? ALCHEMY_SIMULATION_TIMEOUT_MS;
  const fetcher = deps.fetch ?? fetchWithTimeout;
  // Start the standards-based hedge first so a slow legacy call cannot consume
  // the entire user-visible latency window before the fallback begins.
  const fallback = simulateV1Fallback(
    request,
    transaction,
    endpoint,
    timeoutMs,
    deps,
  );
  const primary = fetcher(
    endpoint,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        method: "alchemy_simulateAssetChanges",
        params: [transaction],
      }),
    },
    timeoutMs,
  );

  try {
    const response = await primary;
    if (!response.ok) {
      return (
        (await fallback) ?? unavailable(`Alchemy returned HTTP ${response.status}.`)
      );
    }

    const payload = (await response.json()) as AlchemyPayload;
    if (payload.error) {
      if (isBigIntProviderError(payload.error)) {
        return (await fallback) ?? rpcFailure(payload.error);
      }
      return rpcFailure(payload.error);
    }
    if (payload.result?.error) {
      return {
        ok: false,
        provider: "alchemy",
        reverted: true,
        revertReason: errorText(payload.result.error),
        changes: [],
      };
    }

    const changes = Array.isArray(payload.result?.changes)
      ? payload.result.changes
          .map((change) => mapChange(change, request.from))
          .filter((change): change is AssetChange => change !== undefined)
      : [];
    return { ok: true, provider: "alchemy", changes };
  } catch (error) {
    return (await fallback) ?? unavailable(errorText(error));
  }
}

async function simulateV1Fallback(
  request: AnalysisRequest,
  transaction: SimulationTransaction,
  endpoint: string,
  timeoutMs: number,
  deps: AlchemySimulationDeps,
): Promise<SimulationResult | undefined> {
  try {
    const response = await (deps.fetch ?? fetchWithTimeout)(
      endpoint,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: `${request.id}:eth_simulateV1`,
          method: "eth_simulateV1",
          params: [
            {
              blockStateCalls: [
                {
                  calls: [transaction],
                  traceTransfers: true,
                  validation: false,
                },
              ],
            },
            "latest",
          ],
        }),
      },
      timeoutMs,
    );
    if (!response.ok) return undefined;
    const payload = (await response.json()) as unknown;
    if (isRecord(payload) && payload.error) return undefined;
    return simulationFromEthSimulateV1(payload, request, transaction);
  } catch {
    return undefined;
  }
}

function mapChange(value: unknown, account: Address): AssetChange | undefined {
  if (!isRecord(value)) return undefined;
  const change = value as AlchemyChange;
  if (
    typeof change.changeType === "string" &&
    change.changeType.toUpperCase() !== "TRANSFER"
  ) {
    return undefined;
  }

  const from = normalizeAddress(change.from);
  const to = normalizeAddress(change.to);
  const owner = account.toLowerCase();
  const outgoing = from === owner && to !== owner;
  const incoming = to === owner && from !== owner;
  if (!outgoing && !incoming) return undefined;

  const kind = assetKind(change.assetType);
  if (!kind) return undefined;
  const decimals = numberValue(change.decimals) ?? (kind === "native" ? 18 : 0);
  const magnitude = rawAmount(change.rawAmount, change.amount, decimals);
  if (magnitude === undefined) return undefined;
  const delta = outgoing ? -magnitude : magnitude;
  const symbol =
    typeof change.symbol === "string" && change.symbol.trim()
      ? change.symbol.trim()
      : kind === "native"
        ? "ETH"
        : undefined;
  const token =
    typeof change.contractAddress === "string" && isAddress(change.contractAddress)
    ? getAddress(change.contractAddress)
    : undefined;
  const tokenId = integerValue(change.tokenId);
  const displayAmount =
    kind === "erc721" ? "1" : trimFraction(formatUnits(magnitude, decimals));
  const displayAsset = symbol ?? kind.toUpperCase();

  return {
    kind,
    ...(token ? { token } : {}),
    ...(symbol ? { symbol } : {}),
    ...(kind !== "native" ? { decimals } : {}),
    ...(tokenId !== undefined ? { tokenId } : {}),
    delta,
    formatted: `${outgoing ? "-" : "+"}${displayAmount} ${displayAsset}${
      tokenId !== undefined ? ` #${tokenId}` : ""
    }`,
  };
}

function rawAmount(
  raw: unknown,
  formatted: unknown,
  decimals: number,
): bigint | undefined {
  try {
    if (typeof raw === "string" && raw.trim()) return BigInt(raw);
    if (typeof formatted === "string" && /^\d+(?:\.\d+)?$/.test(formatted)) {
      return parseUnits(formatted, decimals);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function assetKind(value: unknown): AssetChange["kind"] | undefined {
  if (typeof value !== "string") return undefined;
  switch (value.toUpperCase()) {
    case "NATIVE":
      return "native";
    case "ERC20":
      return "erc20";
    case "ERC721":
      return "erc721";
    case "ERC1155":
      return "erc1155";
    default:
      return undefined;
  }
}

function normalizeAddress(value: unknown): string | undefined {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function integerValue(value: unknown): bigint | undefined {
  try {
    if (typeof value === "string" && value.trim()) return BigInt(value);
    if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  } catch {
    return undefined;
  }
  return undefined;
}

function trimFraction(value: string): string {
  if (!value.includes(".")) return value;
  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed || "0";
}

function rpcFailure(error: NonNullable<AlchemyPayload["error"]>): SimulationResult {
  return unavailable(
    typeof error.message === "string"
      ? error.message
      : `Alchemy JSON-RPC error ${String(error.code ?? "unknown")}.`,
  );
}

function isBigIntProviderError(
  error: NonNullable<AlchemyPayload["error"]>,
): boolean {
  return (
    error.code === -32603 &&
    typeof error.message === "string" &&
    error.message.includes("bigInt is not defined")
  );
}

function unavailable(error: string): SimulationResult {
  return { ok: false, provider: "none", changes: [], error };
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Alchemy simulation failed.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
