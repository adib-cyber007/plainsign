import { deserialize, serialize } from "../src/bridge/protocol";
import { createRuntimeDegradedResult } from "../src/bridge/degraded";
import { loadSettings, type PlainSignSettings } from "../src/config/settings";
import { buildRevokeTransaction } from "../src/revoke";
import { mountOverlay, type OverlayController } from "../src/ui/mount";
import type {
  BgToContent,
  ContentToBg,
  ContentToMain,
  MainToContent,
  RevokeTransaction,
  UserDecision,
} from "../src/types";

const BACKGROUND_TIMEOUT_MS = 4_500;
interface ActiveRequest {
  id: string;
  controller: OverlayController;
  decided: boolean;
  revokeTransaction?: RevokeTransaction;
}

let active: ActiveRequest | undefined;
let settingsPromise: Promise<PlainSignSettings> | undefined;
const seenIdsByOrigin = new Map<string, string[]>();

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    console.info("[PlainSign] content loaded");
    settingsPromise = loadSettings();

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

      if (!rememberRequest(decoded.payload.origin, decoded.payload.id)) return;

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
  const current: ActiveRequest = {
    id: message.payload.id,
    decided: false,
    controller,
  };
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
  let backgroundError: string | undefined;
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
  } catch (error) {
    backgroundError = runtimeErrorMessage(error);
    result = undefined;
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }

  if (!current.decided) {
    const settings = await (settingsPromise ?? loadSettings());
    const revokeTransaction = result
      ? buildRevokeTransaction(message.payload, result.payload.intent)
      : undefined;
    current.revokeTransaction = revokeTransaction;
    current.controller.showResult(
      result?.payload ?? createRuntimeDegradedResult(message.payload, backgroundError),
      settings.showTechnicalByDefault,
      Boolean(revokeTransaction),
    );
  }
}

function finish(request: ActiveRequest, decision: UserDecision): void {
  if (request.decided) return;
  request.decided = true;
  const message: ContentToMain = {
    type: "PS_DECISION",
    id: request.id,
    decision:
      decision === "revoke" && !request.revokeTransaction
        ? "reject"
        : decision,
    ...(decision === "revoke" && request.revokeTransaction
      ? { transaction: request.revokeTransaction }
      : {}),
  };
  window.postMessage(serialize(message), "*");
  request.controller.unmount();
  if (active === request) active = undefined;
}

function rememberRequest(origin: string, id: string): boolean {
  const ids = seenIdsByOrigin.get(origin) ?? [];
  if (ids.includes(id)) return false;
  ids.push(id);
  if (ids.length > 256) ids.shift();
  seenIdsByOrigin.set(origin, ids);
  return true;
}

function runtimeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
