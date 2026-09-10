import { deserialize, serialize } from "../src/bridge/protocol";
import type {
  AnalysisRequest,
  AnalysisResult,
  BgToContent,
  ContentToBg,
  IntentKind,
} from "../src/types";

export default defineBackground(() => {
  console.info("[PlainSign] background loaded");

  chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
    if (isMessageType(rawMessage, "PS_PING")) {
      sendResponse({ type: "PS_PONG" as const });
      return false;
    }

    let decoded: unknown;
    try {
      decoded = deserialize(rawMessage);
    } catch {
      return false;
    }

    if (!isMessageType(decoded, "PS_BG_ANALYZE") || !("payload" in decoded)) {
      return false;
    }

    const message = decoded as ContentToBg;
    void stubAnalyze(message.payload).then((result) => {
      const response: BgToContent = { type: "PS_BG_RESULT", payload: result };
      sendResponse(serialize(response));
    });
    return true;
  });
});

function isMessageType(
  value: unknown,
  type: string,
): value is Record<string, unknown> & { type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === type
  );
}

async function stubAnalyze(request: AnalysisRequest): Promise<AnalysisResult> {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    id: request.id,
    intent: {
      kind: stubIntentKind(request),
      method: request.request.method,
      raw: request.request.params,
    },
    simulation: {
      ok: false,
      changes: [],
      provider: "none",
    },
    risk: {
      score: 25,
      verdict: "caution",
      reasons: [],
    },
    explanation: {
      summary: `Stub analysis for ${request.request.method}`,
      beginner: [],
      technical: [],
      source: "template",
    },
    durationMs: Date.now() - startedAt,
    degraded: "Phase 1 stub analysis",
  };
}

function stubIntentKind(request: AnalysisRequest): IntentKind {
  if (
    request.request.method === "eth_signTypedData_v3" ||
    request.request.method === "eth_signTypedData_v4"
  ) {
    return "unknown_typed_data";
  }
  if (request.request.method === "personal_sign") {
    return "plain_message";
  }
  if (request.request.method === "eth_sign") {
    return "raw_hash";
  }
  return "unknown_function";
}
