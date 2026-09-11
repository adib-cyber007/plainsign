import { describe, expect, it } from "vitest";

import { createRuntimeDegradedResult } from "../../../src/bridge/degraded";
import type { AnalysisRequest } from "../../../src/types";

const request: AnalysisRequest = {
  id: "degraded-test",
  origin: "https://example.com",
  chainId: 11_155_111,
  from: "0x1111111111111111111111111111111111111111",
  request: { method: "eth_sendTransaction", params: [] },
};

describe("runtime degraded result", () => {
  it("asks for a reload when the extension context was invalidated", () => {
    const result = createRuntimeDegradedResult(
      request,
      "Extension context invalidated.",
    );

    expect(result.risk.verdict).toBe("caution");
    expect(result.degraded).toContain("Reload this page");
    expect(result.explanation.whatCouldGoWrong).toContain("Reload this page");
  });

  it("preserves a generic background failure without throwing", () => {
    const result = createRuntimeDegradedResult(request, "Message port closed");

    expect(result.simulation.ok).toBe(false);
    expect(result.degraded).toBe("Message port closed");
    expect(result.risk.reasons[0]?.id).toBe("analysis_failed");
  });
});
