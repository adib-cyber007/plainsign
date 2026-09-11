import { serialize } from "../bridge/protocol";
import { fetchWithTimeout } from "../lib/fetchWithTimeout";
import type {
  Explanation,
  Intent,
  RiskResult,
  SimulationResult,
} from "../types";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
const LLM_TIMEOUT_MS = 1_500;
const BANNED_BEGINNER_WORDS =
  /\b(?:approve|spender|operator|calldata|allowance|EOA|msg\.sender)\b/i;

export interface LlmRewordDeps {
  apiKey?: string;
  fetch?: typeof fetchWithTimeout;
  timeoutMs?: number;
}

interface RewordedCopy {
  summary: string;
  beginner: string[];
  whatCouldGoWrong: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: unknown }> };
  }>;
}

export async function rewordExplanation(
  intent: Intent,
  simulation: SimulationResult,
  risk: RiskResult,
  template: Explanation,
  deps: LlmRewordDeps = {},
): Promise<Explanation> {
  const configuredKey =
    import.meta.env?.MODE === "test" ? undefined : import.meta.env?.VITE_LLM_KEY;
  const apiKey = (deps.apiKey ?? configuredKey)?.trim();
  if (!apiKey) return template;

  if (import.meta.env?.VITE_E2E_MOCK_LLM === "1") {
    return { ...template, source: "llm" };
  }

  try {
    const response = await (deps.fetch ?? fetchWithTimeout)(
      GEMINI_ENDPOINT,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(geminiRequest(intent, simulation, risk)),
      },
      deps.timeoutMs ?? LLM_TIMEOUT_MS,
    );
    if (!response.ok) return template;

    const payload = (await response.json()) as GeminiResponse;
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return template;
    const copy = validateCopy(JSON.parse(text) as unknown);
    if (!copy) return template;

    return {
      ...template,
      ...copy,
      source: "llm",
    };
  } catch {
    return template;
  }
}

function geminiRequest(
  intent: Intent,
  simulation: SimulationResult,
  risk: RiskResult,
): unknown {
  const safetyInput = serialize({
    intent: withoutRaw(intent),
    changes: simulation.changes,
    reasons: risk.reasons,
  });
  return {
    systemInstruction: {
      parts: [
        {
          text:
            "Rewrite the supplied wallet-safety facts for a beginner. Never add, remove, downgrade, or contradict a risk reason. Return only the requested JSON fields. Do not use these words in summary or beginner bullets: approve, spender, operator, calldata, allowance, EOA, msg.sender.",
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: JSON.stringify(safetyInput) }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 320,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        additionalProperties: false,
        required: ["summary", "beginner", "whatCouldGoWrong"],
        properties: {
          summary: { type: "STRING" },
          beginner: {
            type: "ARRAY",
            minItems: 1,
            maxItems: 5,
            items: { type: "STRING" },
          },
          whatCouldGoWrong: { type: "STRING" },
        },
      },
    },
  };
}

function withoutRaw(intent: Intent): Omit<Intent, "raw" | "children"> & {
  children?: ReturnType<typeof withoutRaw>[];
} {
  const { raw, children, ...safe } = intent;
  void raw;
  return {
    ...safe,
    ...(children ? { children: children.map(withoutRaw) } : {}),
  };
}

function validateCopy(value: unknown): RewordedCopy | undefined {
  if (!isRecord(value)) return undefined;
  if (
    Object.keys(value).sort().join(",") !==
    "beginner,summary,whatCouldGoWrong"
  ) {
    return undefined;
  }
  if (
    !validText(value.summary, 280) ||
    !Array.isArray(value.beginner) ||
    value.beginner.length < 1 ||
    value.beginner.length > 5 ||
    !value.beginner.every((item) => validText(item, 280)) ||
    !validText(value.whatCouldGoWrong, 500)
  ) {
    return undefined;
  }
  if (
    BANNED_BEGINNER_WORDS.test(value.summary) ||
    value.beginner.some((item) => BANNED_BEGINNER_WORDS.test(item)) ||
    !/[.!?]$/.test(value.summary)
  ) {
    return undefined;
  }
  return {
    summary: value.summary,
    beginner: value.beginner,
    whatCouldGoWrong: value.whatCouldGoWrong,
  };
}

function validText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
