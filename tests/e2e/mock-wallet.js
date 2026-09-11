(() => {
  const options = new URL(window.location.href).searchParams;
  const requestedAccount = options.get("walletAccount");
  const ACCOUNT = /^0x[0-9a-fA-F]{40}$/.test(requestedAccount ?? "")
    ? requestedAccount
    : "0x1111111111111111111111111111111111111111";
  const CHAIN_ID = options.get("walletChainId") ?? "0x7a69";
  const TX_HASH = `0x${"a".repeat(64)}`;
  const SIGNATURE = `0x${"b".repeat(130)}`;
  const interceptedMethods = new Set([
    "eth_sendTransaction",
    "eth_signTypedData_v4",
    "eth_signTypedData_v3",
    "personal_sign",
    "eth_sign",
  ]);
  const listeners = new Map();

  window.__walletCalls = [];
  window.__walletCallSameReference = [];

  const provider = {
    isMetaMask: true,
    chainId: CHAIN_ID,
    selectedAddress: ACCOUNT,
    async request(args) {
      switch (args.method) {
        case "eth_chainId":
          return CHAIN_ID;
        case "eth_accounts":
        case "eth_requestAccounts":
          return [ACCOUNT];
        case "eth_blockNumber":
          return "0x1";
        default:
          if (!interceptedMethods.has(args.method)) {
            return null;
          }
          window.__walletCallSameReference.push(
            args === window.__lastRequestArgs,
          );
          window.__walletCalls.push(args);
          console.info(`[MockWallet] received ${args.method}`);
          return args.method === "eth_sendTransaction" ? TX_HASH : SIGNATURE;
      }
    },
    on(event, listener) {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(listener);
      listeners.set(event, handlers);
      return provider;
    },
    removeListener(event, listener) {
      listeners.get(event)?.delete(listener);
      return provider;
    },
  };

  window.__walletRawProvider = provider;

  const install = () => {
    window.ethereum = provider;
  };
  const mode =
    new URL(window.location.href).searchParams.get("mode") ?? "immediate";

  if (mode === "eip6963") {
    const info = Object.freeze({
      uuid: "350670db-19fa-4704-a166-e52e178b59d2",
      name: "PlainSign Mock Wallet",
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
      rdns: "dev.plainsign.mock",
    });
    const announce = () =>
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: Object.freeze({ info, provider }),
        }),
      );
    window.addEventListener("eip6963:requestProvider", announce);
  } else if (mode === "frozen") {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        Object.defineProperty(window, "ethereum", {
          configurable: false,
          enumerable: true,
          writable: false,
          value: provider,
        });
      },
      { once: true },
    );
  } else if (mode === "delayed") {
    window.setTimeout(install, 50);
  } else if (mode === "onload") {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
