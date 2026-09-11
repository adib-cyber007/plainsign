const options = new URL(window.location.href).searchParams;
const TARGET = `0x${"2".repeat(38)}aa`;
const out = document.querySelector("#out");
const status = document.querySelector("#status");
let activeAccount;
let selectedProvider = window.ethereum;

window.__eip6963Announcements = [];
window.addEventListener("eip6963:announceProvider", (event) => {
  const detail = event.detail;
  if (!detail?.info?.uuid || !detail.provider) return;
  window.__eip6963Announcements.push(detail.info.uuid);
  selectedProvider ??= detail.provider;
  window.__selectedWalletProvider = selectedProvider;
});
window.dispatchEvent(new Event("eip6963:requestProvider"));
window.__selectedWalletProvider = selectedProvider;

if (options.get("layout") === "overflow-hidden") {
  document.documentElement.style.overflow = "hidden";
}
if (options.get("layout") === "fixed-header") {
  const header = document.createElement("div");
  header.id = "host-fixed-header";
  Object.assign(header.style, {
    position: "fixed",
    inset: "0 0 auto",
    zIndex: "2147483646",
    height: "96px",
    background: "#ff4d66",
  });
  document.body.append(header);
}

const permit2 = {
  domain: {
    name: "Permit2",
    chainId: 31337,
    verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
  primaryType: "PermitSingle",
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
  },
  message: {
    details: {
      token: TARGET,
      amount: "1461501637330902918203684832716283019655932542975",
      expiration: 4102444800,
      nonce: 0,
    },
    spender: TARGET,
    sigDeadline: 4102444800,
  },
};

function provider() {
  const current = selectedProvider ?? window.ethereum;
  if (!current) throw new Error("No wallet provider announced.");
  return current;
}

async function request(args) {
  status.textContent = `Requesting ${args.method}…`;
  window.__lastRequestArgs = args;
  try {
    const result = await provider().request(args);
    out.textContent = typeof result === "string" ? result : JSON.stringify(result);
    status.textContent = "Request completed.";
    return result;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ? error.code : "unknown";
    out.textContent = `error ${code}`;
    status.textContent = "Request rejected.";
    return undefined;
  }
}

async function requestWithAccount(makeArgs) {
  if (!activeAccount) {
    const accounts = await provider().request({ method: "eth_accounts" });
    if (Array.isArray(accounts) && typeof accounts[0] === "string") activeAccount = accounts[0];
  }
  if (!activeAccount) {
    out.textContent = "error wallet not connected";
    status.textContent = "Click Connect first.";
    return;
  }
  return request(makeArgs(activeAccount));
}

async function getActiveChainId() {
  const chainId = await provider().request({ method: "eth_chainId" });
  const parsed = typeof chainId === "string" ? Number.parseInt(chainId, 16) : Number(chainId);
  return Number.isSafeInteger(parsed) ? parsed : permit2.domain.chainId;
}

document.querySelector("#connect").addEventListener("click", async () => {
  const accounts = await request({ method: "eth_requestAccounts" });
  if (Array.isArray(accounts) && typeof accounts[0] === "string") {
    activeAccount = accounts[0];
    status.textContent = `Connected: ${activeAccount.slice(0, 8)}…${activeAccount.slice(-4)}`;
  }
});
document.querySelector("#send-transaction").addEventListener("click", () =>
  requestWithAccount((account) => ({ method: "eth_sendTransaction", params: [{ from: account, to: TARGET, value: "0x1" }] })),
);
document.querySelector("#sign-typed-data").addEventListener("click", async () => {
  const chainId = await getActiveChainId();
  return requestWithAccount((account) => ({ method: "eth_signTypedData_v4", params: [account, JSON.stringify({ ...permit2, domain: { ...permit2.domain, chainId } })] }));
});
document.querySelector("#sign-message").addEventListener("click", () =>
  requestWithAccount((account) => ({ method: "personal_sign", params: ["0x48656c6c6f2066726f6d20506c61696e5369676e", account] })),
);
document.querySelector("#eth-sign").addEventListener("click", () =>
  requestWithAccount((account) => ({ method: "eth_sign", params: [account, `0x${"ff".repeat(32)}`] })),
);
document.querySelector("#chain-id").addEventListener("click", () => request({ method: "eth_chainId" }));
