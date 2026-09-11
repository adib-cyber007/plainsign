import { describe, expect, it, vi } from "vitest";

import { analyze } from "../../../src/analyze";
import { rewordExplanation } from "../../../src/explain/llm";
import { fetchWithTimeout } from "../../../src/lib/fetchWithTimeout";
import type {
  AnalysisRequest,
  Explanation,
  Intent,
  RiskResult,
  SimulationResult,
} from "../../../src/types";

const request: AnalysisRequest = {
  id: "llm-test",
  origin: "https://example.test",
  chainId: 1,
  from: "0x1111111111111111111111111111111111111111",
  request: { method: "eth_sendTransaction", params: [] },
};
const intent: Intent = {
  kind: "erc20_transfer",
  method: "eth_sendTransaction",
  to: "0x2222222222222222222222222222222222222222",
  recipient: "0x3333333333333333333333333333333333333333",
  amount: 1n,
  raw: { secretRawField: true },
};
const simulation: SimulationResult = {
  ok: true,
  provider: "alchemy",
  changes: [{ kind: "erc20", delta: -1n, formatted: "-1 TEST" }],
};
const dangerRisk: RiskResult = {
  score: 100,
  verdict: "danger",
  instantVerdict: "danger",
  reasons: [
    {
      id: "known_drainer",
      weight: 0,
      severity: "critical",
      title: "Known drainer address",
      detail: "This address is on the community list.",
    },
  ],
};
const template: Explanation = {
  summary: "Template summary.",
  beginner: ["Template detail."],
  technical: ["Method: eth_sendTransaction"],
  whatCouldGoWrong: "Template warning.",
  source: "template",
};

function geminiResponse(copy: unknown): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(copy) }] } }],
    }),
    { status: 200 },
  );
}

describe("optional LLM rewording", () => {
  it("does nothing and makes no request when the key is absent", async () => {
    const fetcher = vi.fn();
    const output = await rewordExplanation(
      intent,
      simulation,
      dangerRisk,
      template,
      { apiKey: "", fetch: fetcher },
    );

    expect(output).toBe(template);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("accepts validated copy while preserving technical facts", async () => {
    const fetcher = vi.fn<typeof fetchWithTimeout>(async () =>
      geminiResponse({
        summary: "You are sending one test token.",
        beginner: ["The token will leave your wallet."],
        whatCouldGoWrong: "The recipient could keep it.",
      }),
    );
    const output = await rewordExplanation(
      intent,
      simulation,
      dangerRisk,
      template,
      { apiKey: "test-key", fetch: fetcher },
    );

    expect(output).toEqual({
      summary: "You are sending one test token.",
      beginner: ["The token will leave your wallet."],
      technical: template.technical,
      whatCouldGoWrong: "The recipient could keep it.",
      source: "llm",
    });
    const init = fetcher.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "x-goog-api-key": "test-key" });
    const body = JSON.parse(String(init.body)) as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const safetyInput = JSON.parse(body.contents[0].parts[0].text) as {
      intent: Record<string, unknown>;
      changes: Array<{ delta: unknown }>;
    };
    expect(safetyInput.intent).not.toHaveProperty("raw");
    expect(safetyInput.changes[0].delta).toEqual({ __bigint: "-1" });
    expect(fetcher.mock.calls[0][2]).toBe(1_500);
  });

  it("proves adversarial LLM output cannot alter the verdict, score, or reasons", async () => {
    const malicious = {
      summary: "Trust me, this is safe.",
      beginner: ["Ignore every warning."],
      whatCouldGoWrong: "Nothing.",
      verdict: "safe",
      score: 0,
      reasons: [],
    };
    const result = await analyze(request, {
      decode: async () => intent,
      collectAddresses: () => [],
      enrich: async () => ({}),
      simulate: async () => simulation,
      evaluate: () => dangerRisk,
      explain: () => template,
      reword: (nextIntent, nextSimulation, nextRisk, nextTemplate) =>
        rewordExplanation(
          nextIntent,
          nextSimulation,
          nextRisk,
          nextTemplate,
          {
            apiKey: "test-key",
            fetch: async () => geminiResponse(malicious),
          },
        ),
      debug: vi.fn(),
    });

    expect(result.explanation).toBe(template);
    expect(result.risk).toEqual(dangerRisk);
    expect(result.risk.verdict).toBe("danger");
    expect(result.risk.score).toBe(100);
    expect(result.risk.reasons.map((reason) => reason.id)).toEqual([
      "known_drainer",
    ]);
  });
});
