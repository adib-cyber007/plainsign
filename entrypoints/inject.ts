import { createId } from "../src/bridge/ids";
import { deserialize, serialize } from "../src/bridge/protocol";
import { INTERCEPTED_METHODS } from "../src/config/intercept";
import type {
  AnalysisRequest,
  ContentToMain,
  InterceptedMethod,
  MainToContent,
} from "../src/types";

interface ProviderRequestArguments {
  method: string;
  params?: unknown[] | object;
}

interface EthereumProvider {
  request: (args: ProviderRequestArguments) => Promise<unknown>;
  send?: (...args: unknown[]) => unknown;
  sendAsync?: (...args: unknown[]) => unknown;
  chainId?: string | number;
  selectedAddress?: string;
}

interface JsonRpcPayload extends ProviderRequestArguments {
  id?: string | number;
  jsonrpc?: string;
}

type JsonRpcCallback = (error: unknown, response?: unknown) => void;

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    __plainsign?: {
      version: string;
      wrapped: boolean;
      interceptedCalls: number;
    };
  }
}

const VERSION = "0.1.0";
const DECISION_TIMEOUT_MS = 60_000;
const CONTENT_READY_TIMEOUT_MS = 1_000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const interceptedMethods = new Set<string>(INTERCEPTED_METHODS);
let contentIsReady = false;
let resolveContentReady: (() => void) | undefined;
const contentReady = new Promise<void>((resolve) => {
  resolveContentReady = resolve;
});

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    try {
      installInterceptor();
    } catch {
      // A hostile page descriptor must never prevent the page itself from loading.
    }
  },
});

function installInterceptor(): void {
  console.info("[PlainSign] inject loaded");
  installContentHandshake();
  window.__plainsign = {
    version: VERSION,
    wrapped: false,
    interceptedCalls: 0,
  };

  const wrappedProviders = new WeakMap<object, EthereumProvider>();

  const wrap = (provider: EthereumProvider): EthereumProvider => {
    if (!isObject(provider)) {
      return provider;
    }

    const existing = wrappedProviders.get(provider);
    if (existing) {
      return existing;
    }

    const interceptedRequest = (
      args: ProviderRequestArguments,
    ): Promise<unknown> => {
      if (!interceptedMethods.has(args.method)) {
        return provider.request(args);
      }

      return analyzeThenRequest(
        provider,
        args as ProviderRequestArguments & { method: InterceptedMethod },
      );
    };

    const proxy = new Proxy(provider, {
      get(target, property) {
        if (property === "request") {
          return interceptedRequest;
        }

        if (property === "send" || property === "sendAsync") {
          return (...callArgs: unknown[]) =>
            handleLegacyCall(target, interceptedRequest, property, callArgs);
        }

        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    wrappedProviders.set(provider, proxy);
    wrappedProviders.set(proxy, proxy);
    if (window.__plainsign) {
      window.__plainsign.wrapped = true;
    }
    return proxy;
  };

  const replaceWithWrappedProvider = (): void => {
    try {
      const current = window.ethereum;
      if (!current || !isObject(current)) {
        return;
      }

      const wrapped = wrap(current);
      if (current === wrapped) {
        return;
      }

      const descriptor = Object.getOwnPropertyDescriptor(window, "ethereum");
      if (!descriptor || descriptor.configurable) {
        Object.defineProperty(window, "ethereum", {
          configurable: true,
          enumerable: descriptor?.enumerable ?? true,
          writable: true,
          value: wrapped,
        });
      } else if ("writable" in descriptor && descriptor.writable) {
        window.ethereum = wrapped;
      }
    } catch {
      // Wallets control this property; a DOM-ready retry handles common redefine races.
    }
  };

  try {
    if (window.ethereum && isObject(window.ethereum)) {
      replaceWithWrappedProvider();
    } else {
      let realProvider: EthereumProvider | undefined;
      Object.defineProperty(window, "ethereum", {
        configurable: true,
        enumerable: true,
        set(provider: EthereumProvider | undefined) {
          realProvider =
            provider && isObject(provider) ? wrap(provider) : provider;
        },
        get() {
          return realProvider && isObject(realProvider)
            ? wrap(realProvider)
            : undefined;
        },
      });
    }
  } catch {
    // Installation must never prevent the host page or wallet from loading.
  }

  window.addEventListener(
    "DOMContentLoaded",
    () => {
      replaceWithWrappedProvider();
    },
    { once: true },
  );
}

function isObject(value: unknown): value is EthereumProvider & object {
  return (
    (typeof value === "object" && value !== null) || typeof value === "function"
  );
}

async function analyzeThenRequest(
  provider: EthereumProvider,
  args: ProviderRequestArguments & { method: InterceptedMethod },
): Promise<unknown> {
  if (window.__plainsign) {
    window.__plainsign.interceptedCalls += 1;
  }

  const request = await buildAnalysisRequest(provider, args);
  await waitForContentReady();
  const decision = waitForDecision(request.id);
  const message: MainToContent = { type: "PS_ANALYZE", payload: request };
  window.postMessage(serialize(message), "*");

  if ((await decision) !== "continue") {
    throw Object.assign(new Error("User rejected the request."), {
      code: 4001,
    });
  }

  return provider.request(args);
}

function installContentHandshake(): void {
  window.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (event.source !== window || contentIsReady) return;
    try {
      const message = deserialize(event.data) as ContentToMain;
      if (message.type === "PS_PONG") {
        contentIsReady = true;
        resolveContentReady?.();
      }
    } catch {
      // Ignore unrelated page messages.
    }
  });
  const ping: MainToContent = { type: "PS_PING" };
  window.postMessage(serialize(ping), "*");
}

async function waitForContentReady(): Promise<void> {
  if (contentIsReady) return;
  await Promise.race([
    contentReady,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, CONTENT_READY_TIMEOUT_MS);
    }),
  ]);
}

async function buildAnalysisRequest(
  provider: EthereumProvider,
  args: ProviderRequestArguments & { method: InterceptedMethod },
): Promise<AnalysisRequest> {
  const params = Array.isArray(args.params) ? args.params : [];
  return {
    id: createId(),
    origin: window.location.origin,
    chainId: await getChainId(provider),
    from: findFromAddress(args.method, params),
    request: {
      method: args.method,
      params,
    },
  };
}

async function getChainId(provider: EthereumProvider): Promise<number> {
  const cached = parseChainId(provider.chainId);
  if (cached !== undefined) {
    return cached;
  }

  try {
    return parseChainId(await provider.request({ method: "eth_chainId" })) ?? 0;
  } catch {
    return 0;
  }
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value;
  }
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function findFromAddress(
  method: InterceptedMethod,
  params: unknown[],
): `0x${string}` {
  if (method === "eth_sendTransaction") {
    const transaction = params[0];
    if (isRecord(transaction) && isAddress(transaction.from)) {
      return transaction.from;
    }
  }

  const preferredIndex = method === "personal_sign" ? 1 : 0;
  const preferred = params[preferredIndex];
  if (isAddress(preferred)) {
    return preferred;
  }

  const anyAddress = params.find(isAddress);
  if (anyAddress) {
    return anyAddress;
  }

  return isAddress(window.ethereum?.selectedAddress)
    ? window.ethereum.selectedAddress
    : ZERO_ADDRESS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function waitForDecision(id: string): Promise<"continue" | "reject"> {
  return new Promise((resolve) => {
    const finish = (decision: "continue" | "reject"): void => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timeoutId);
      resolve(decision);
    };

    const onMessage = (event: MessageEvent<unknown>): void => {
      if (event.source !== window) {
        return;
      }

      try {
        const message = deserialize(event.data) as ContentToMain;
        if (message.type === "PS_DECISION" && message.id === id) {
          finish(message.decision);
        }
      } catch {
        // Ignore unrelated or malformed page messages.
      }
    };

    const timeoutId = window.setTimeout(
      () => finish("reject"),
      DECISION_TIMEOUT_MS,
    );
    window.addEventListener("message", onMessage);
  });
}

function handleLegacyCall(
  provider: EthereumProvider,
  request: (args: ProviderRequestArguments) => Promise<unknown>,
  property: "send" | "sendAsync",
  callArgs: unknown[],
): unknown {
  const payload = toRequestArguments(callArgs[0], callArgs[1]);
  if (!payload || !interceptedMethods.has(payload.method)) {
    const original = provider[property];
    return typeof original === "function"
      ? original.apply(provider, callArgs)
      : provider.request(payload ?? { method: String(callArgs[0]) });
  }

  const result = request(payload);
  const callback = callArgs.find(
    (argument): argument is JsonRpcCallback => typeof argument === "function",
  );
  if (!callback) {
    return result;
  }

  void result.then(
    (value) =>
      callback(null, {
        id: "id" in payload ? payload.id : undefined,
        jsonrpc: "jsonrpc" in payload ? payload.jsonrpc : "2.0",
        result: value,
      }),
    (error: unknown) => callback(error),
  );
  return undefined;
}

function toRequestArguments(
  first: unknown,
  second: unknown,
): JsonRpcPayload | undefined {
  if (typeof first === "string") {
    return {
      method: first,
      params: Array.isArray(second) ? second : [],
    };
  }

  if (isRecord(first) && typeof first.method === "string") {
    return first as unknown as JsonRpcPayload;
  }

  return undefined;
}
