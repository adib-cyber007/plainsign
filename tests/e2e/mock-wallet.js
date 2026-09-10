(() => {
  const ACCOUNT = "0x1111111111111111111111111111111111111111";
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
    chainId: "0x7a69",
    selectedAddress: ACCOUNT,
    async request(args) {
      switch (args.method) {
        case "eth_chainId":
          return "0x7a69";
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

  const install = () => {
    window.ethereum = provider;
  };
  const mode =
    new URL(window.location.href).searchParams.get("mode") ?? "immediate";

  if (mode === "delayed") {
    window.setTimeout(install, 50);
  } else if (mode === "onload") {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
