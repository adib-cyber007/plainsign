import type { AnalysisRequest, SimulationResult } from "../types";
import { loadSettings } from "../config/settings";
import { simulateWithAlchemy } from "./alchemy";

const SEPOLIA_CHAIN_ID = 11_155_111;

export interface SimulateDeps {
  apiKey?: string;
  enabled?: boolean;
  simulateWithAlchemy?: typeof simulateWithAlchemy;
}

export async function simulate(
  request: AnalysisRequest,
  deps: SimulateDeps = {},
): Promise<SimulationResult> {
  const apiKey = deps.apiKey ?? import.meta.env?.VITE_ALCHEMY_KEY?.trim();
  if (
    request.request.method !== "eth_sendTransaction" ||
    request.chainId !== SEPOLIA_CHAIN_ID ||
    !apiKey
  ) {
    return { ok: false, provider: "none", changes: [] };
  }

  const enabled = deps.enabled ?? (await loadSettings()).simulationEnabled;
  if (!enabled || !apiKey) {
    return { ok: false, provider: "none", changes: [] };
  }

  return (deps.simulateWithAlchemy ?? simulateWithAlchemy)(request, apiKey);
}
