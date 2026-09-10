import { deserialize, serialize } from "../src/bridge/protocol";
import { mountOverlay, type OverlayController } from "../src/ui/mount";
import type {
  AnalysisRequest,
  AnalysisResult,
  BgToContent,
  ContentToBg,
  ContentToMain,
  MainToContent,
} from "../src/types";

const BACKGROUND_TIMEOUT_MS = 4_500;
const DEGRADED_TEXT =
  "PlainSign could not fully analyze this request. Only continue if you trust this site.";

interface ActiveRequest {
  id: string;
  controller: OverlayController;
  decided: boolean;
}

let active: ActiveRequest | undefined;

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    console.info("[PlainSign] content loaded");

    window.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (event.source !== window) {
        return;
      }

      let decoded: unknown;
      try {
        decoded = deserialize(event.data);
      } catch {
        return;
      }

      if (isMessageType(decoded, "PS_PING")) {
        const pong: ContentToMain = { type: "PS_PONG" };
        window.postMessage(serialize(pong), "*");
        return;
      }

      if (!isAnalyzeMessage(decoded)) {
        return;
      }

      void analyzeAndDecide(decoded).catch((error: unknown) => {
        console.error("[PlainSign] content analysis failed", error);
      });
    });

    const ready: ContentToMain = { type: "PS_PONG" };
    window.postMessage(serialize(ready), "*");
  },
});

async function analyzeAndDecide(
  message: Extract<MainToContent, { type: "PS_ANALYZE" }>,
): Promise<void> {
  if (active && !active.decided) {
    finish(active, "reject");
  }

  const holder: { current?: ActiveRequest } = {};
  const controller = mountOverlay((decision) => {
    if (holder.current) finish(holder.current, decision);
  });
  const current = { id: message.payload.id, decided: false, controller };
  holder.current = current;
  active = current;

  const backgroundMessage: ContentToBg = {
    type: "PS_BG_ANALYZE",
    payload: message.payload,
  };

  let timeoutId: number | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timeoutId = window.setTimeout(
      () => resolve(undefined),
      BACKGROUND_TIMEOUT_MS,
    );
  });

  let result: BgToContent | undefined;
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage(serialize(backgroundMessage)),
      timeout,
    ]);
    if (response !== undefined) {
      const decoded = deserialize(response) as BgToContent;
      if (
        decoded.type === "PS_BG_RESULT" &&
        decoded.payload.id === message.payload.id
      ) {
        result = decoded;
      }
    }
  } catch {
    result = undefined;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }

  if (!current.decided) {
    current.controller.showResult(
      result?.payload ?? degradedResult(message.payload),
    );
  }
}

function finish(request: ActiveRequest, decision: "continue" | "reject"): void {
  if (request.decided) return;
  request.decided = true;
  const message: ContentToMain = {
    type: "PS_DECISION",
    id: request.id,
    decision,
  };
  window.postMessage(serialize(message), "*");
  request.controller.unmount();
  if (active === request) active = undefined;
}

function degradedResult(request: AnalysisRequest): AnalysisResult {
  const method = request.request.method;
  return {
    id: request.id,
    intent: {
      kind:
        method === "eth_sendTransaction"
          ? "unknown_function"
          : method === "eth_signTypedData_v3" ||
              method === "eth_signTypedData_v4"
            ? "unknown_typed_data"
            : method === "eth_sign"
              ? "raw_hash"
              : "plain_message",
      method,
      raw: request.request.params,
      decodeError:
        "The background analysis did not respond within 4.5 seconds.",
    },
    simulation: {
      ok: false,
      provider: "none",
      changes: [],
      error: "Background analysis timed out.",
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
          detail:
            "PlainSign could not complete every safety check before the request timed out.",
        },
      ],
    },
    explanation: {
      summary: DEGRADED_TEXT,
      beginner: [DEGRADED_TEXT],
      technical: [`Method: ${method}`, `Chain ID: ${request.chainId}`],
      whatCouldGoWrong:
        "PlainSign could not complete every safety check before the request timed out.",
      source: "template",
    },
    durationMs: BACKGROUND_TIMEOUT_MS,
    degraded: "Background analysis timed out.",
  };
}

function isAnalyzeMessage(
  value: unknown,
): value is Extract<MainToContent, { type: "PS_ANALYZE" }> {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "PS_ANALYZE" &&
    "payload" in value
  );
}

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
