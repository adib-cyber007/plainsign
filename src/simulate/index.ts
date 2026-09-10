import type { AnalysisRequest, SimulationResult } from "../types";

export async function simulate(
  _request: AnalysisRequest,
): Promise<SimulationResult> {
  void _request;
  return { ok: false, provider: "none", changes: [] };
}
