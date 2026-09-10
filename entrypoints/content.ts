import { deserialize, serialize } from "../src/bridge/protocol";
import type {
  BgToContent,
  ContentToBg,
  ContentToMain,
  MainToContent,
} from "../src/types";

const BACKGROUND_TIMEOUT_MS = 4_500;

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

      if (!isAnalyzeMessage(decoded)) {
        return;
      }

      void analyzeAndDecide(decoded);
    });
  },
});

async function analyzeAndDecide(
  message: Extract<MainToContent, { type: "PS_ANALYZE" }>,
): Promise<void> {
  const backgroundMessage: ContentToBg = {
    type: "PS_BG_ANALYZE",
    payload: message.payload,
  };

  const timeout = new Promise<undefined>((resolve) => {
    window.setTimeout(() => resolve(undefined), BACKGROUND_TIMEOUT_MS);
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
  }

  const shouldContinue = result
    ? window.confirm(
        `PlainSign [${result.payload.risk.verdict}]: ${result.payload.explanation.summary}\n\nContinue to wallet?`,
      )
    : window.confirm(
        "PlainSign could not analyze this request\n\nContinue to wallet?",
      );

  const decision: ContentToMain = {
    type: "PS_DECISION",
    id: message.payload.id,
    decision: shouldContinue ? "continue" : "reject",
  };
  window.postMessage(serialize(decision), "*");
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
