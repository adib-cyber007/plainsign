import { describe, expect, it, vi } from "vitest";

import { analyze, DEGRADED_EXPLANATION } from "../../src/analyze";
import type { AnalysisRequest, Intent } from "../../src/types";

const request: AnalysisRequest = {
  id: "analysis-test",
  origin: "https://example.com",
  chainId: 31337,
  from: "0x1111111111111111111111111111111111111111",
  request: { method: "eth_sendTransaction", params: [] },
};
const intent: Intent = {
  kind: "native_transfer",
  method: "eth_sendTransaction",
  to: "0x2222222222222222222222222222222222222222",
  value: 1n,
  raw: {},
};

describe("analyze", () => {
  it("runs the happy path in order and records stage diagnostics", async () => {
    const stages: string[] = [];
    const result = await analyze(request, {
      decode: async () => intent,
      collectAddresses: () => [intent.to!],
      enrich: async () => ({
        [intent.to!.toLowerCase()]: {
          address: intent.to!,
          isContract: false,
          fetchedAt: 0,
        },
      }),
      simulate: async () => ({ ok: false, provider: "none", changes: [] }),
      evaluate: () => ({ score: 0, verdict: "safe", reasons: [] }),
      explain: () => ({
        summary: "Safe summary.",
        beginner: [],
        technical: [],
        source: "template",
      }),
      debug: (stage) => stages.push(stage),
    });

    expect(result.risk.verdict).toBe("safe");
    expect(result.explanation.summary).toBe("Safe summary.");
    expect(result.degraded).toBeUndefined();
    expect(stages).toEqual([
      "decode",
      "enrich+simulate",
      "evaluate",
      "explain",
    ]);
  });

  it("returns the defined caution result when a stage throws", async () => {
    const result = await analyze(request, {
      decode: async () => {
        throw new Error("decoder exploded");
      },
      debug: vi.fn(),
    });
    expect(result.risk.verdict).toBe("caution");
    expect(result.risk.reasons.map((reason) => reason.id)).toEqual([
      "analysis_failed",
    ]);
    expect(result.explanation.summary).toBe(DEGRADED_EXPLANATION);
    expect(result.degraded).toContain("decoder exploded");
  });

  it("returns the defined caution result when the total budget expires", async () => {
    const result = await analyze(request, {
      decode: async () => new Promise<Intent>(() => undefined),
      budgetMs: 5,
      debug: vi.fn(),
    });
    expect(result.risk.verdict).toBe("caution");
    expect(result.risk.reasons[0].id).toBe("analysis_failed");
    expect(result.degraded).toContain("timed out");
  });
});
