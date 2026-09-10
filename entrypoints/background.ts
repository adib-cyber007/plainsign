import { deserialize, serialize } from "../src/bridge/protocol";
import { analyze } from "../src/analyze";
import type { BgToContent, ContentToBg } from "../src/types";

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
    void analyze(message.payload).then(
      (result) => {
        const response: BgToContent = { type: "PS_BG_RESULT", payload: result };
        sendResponse(serialize(response));
      },
      () => {
        // analyze() owns its degraded fallback, but keep the channel from throwing
        // if the service worker is stopped while an async response is pending.
      },
    );
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
