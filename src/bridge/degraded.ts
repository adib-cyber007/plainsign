import type { AnalysisRequest, AnalysisResult } from "../types";

const DEGRADED_TEXT =
  "PlainSign could not fully analyze this request. Only continue if you trust this site.";

export function createRuntimeDegradedResult(
  request: AnalysisRequest,
  failure?: string,
): AnalysisResult {
  const method = request.request.method;
  const invalidated = failure?.toLowerCase().includes("extension context invalidated");
  const degraded = invalidated
    ? "The extension was reloaded. Reload this page to reconnect PlainSign."
    : failure ?? "Background analysis timed out.";
  const detail = invalidated
    ? "PlainSign was reloaded. Reload this page before approving wallet requests."
    : "PlainSign could not complete every safety check before the request timed out.";

  return {
    id: request.id,
    intent: {
      kind:
        method === "eth_sendTransaction"
          ? "unknown_function"
          : method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4"
            ? "unknown_typed_data"
            : method === "eth_sign"
              ? "raw_hash"
              : "plain_message",
      method,
      raw: request.request.params,
      decodeError: degraded,
    },
    simulation: {
      ok: false,
      provider: "none",
      changes: [],
      error: degraded,
    },
    risk: {
      score: 25,
      verdict: "caution",
      reasons: [
        {
          id: "analysis_failed",
          weight: 0,
          severity: "warn",
          title: "Analysis could not finish",
          detail,
        },
      ],
    },
    explanation: {
      summary: DEGRADED_TEXT,
      beginner: [DEGRADED_TEXT],
      technical: [`Method: ${method}`, `Chain ID: ${request.chainId}`],
      whatCouldGoWrong: invalidated
        ? "Reload this page so PlainSign can reconnect before you continue."
        : detail,
      source: "template",
    },
    durationMs: 4_500,
    degraded,
  };
}
