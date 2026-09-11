import type { AnalysisRequest } from "../types";

export const ALCHEMY_SIMULATION_TIMEOUT_MS = 2_500;
export const DEFAULT_SIMULATION_GAS = "0x1e8480";
export const DEFAULT_SIMULATION_VALUE = "0x0";

export interface SimulationTransaction {
  from: string;
  to?: string;
  data?: string;
  value: string;
  gas: string;
  [key: string]: unknown;
}

export function transactionForSimulation(
  request: AnalysisRequest,
): SimulationTransaction | undefined {
  if (request.request.method !== "eth_sendTransaction") return undefined;
  const candidate = request.request.params[0];
  if (!isRecord(candidate)) return undefined;

  const { nonce: _nonce, ...withoutNonce } = candidate;
  void _nonce;
  return {
    ...withoutNonce,
    from:
      typeof candidate.from === "string" ? candidate.from : request.from,
    value:
      typeof candidate.value === "string"
        ? candidate.value
        : DEFAULT_SIMULATION_VALUE,
    gas:
      typeof candidate.gas === "string" ? candidate.gas : DEFAULT_SIMULATION_GAS,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
