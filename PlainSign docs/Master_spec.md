# MASTER_SPEC.md — PlainSign

> Human: save this file at the root of the git repo (task H2). Every Building-AI prompt
> tells it to read this file first. Section B is the authoritative technical spec.
> Section C contains the copy-paste prompts. You never need to edit sections A or B.

---

## A. Project Brief

**One-liner.** PlainSign is a Chrome extension that reads every transaction or signature a
website asks your wallet to approve and tells you, in one plain sentence, what it will do
to your assets — and warns you before a drainer gets your signature.

**Problem.** The biggest loss vector for everyday crypto users is not smart-contract bugs;
it is signing things they don't understand. Wallets show hex calldata and a "Confirm"
button. Drainer kits disguise `setApprovalForAll(attacker)` as "Mint", and use gasless
EIP-712 signatures (Permit / Permit2 / Seaport) that move assets later, off-chain, so
nothing looks wrong until it's gone. Wallets show *what function is called*, not *what it
means for you*.

**Target user.** Non-expert crypto users who mint NFTs, claim airdrops, and use DeFi from
their browser wallet.

**Solution.** A Manifest V3 Chrome extension that sits between the dApp and the wallet:
1. Intercepts `eth_sendTransaction`, `eth_signTypedData_v4/v3`, `personal_sign`, `eth_sign`
   before the wallet popup opens.
2. Decodes the request (viem, bundled ABIs, EIP-712 pattern-matching).
3. Enriches counterparties (is it a personal wallet or a contract? how old? verified?
   known protocol on its real domain?).
4. Scores risk with **deterministic, human-readable rules in a JSON file** → 🟢 Safe /
   🟡 Caution / 🔴 Danger + reasons.
5. Shows a plain-English overlay: one-sentence summary, expected balance changes,
   "Why?" list, Beginner/Technical toggle, **Continue to wallet** / **Reject**.
6. Continue forwards the *untouched* request to the real wallet; Reject returns the
   standard EIP-1193 error 4001 so the dApp behaves normally.

**Why it wins on the judging criteria.**
| Criterion | How PlainSign hits it |
|---|---|
| Problem | Quantifiable, universal, currently unsolved for signatures |
| Solution | Works on any dApp, in the user's own wallet, in < 2 s |
| Technology | MV3 provider proxy, EIP-6963, viem decoding, EIP-712 parsing, on-chain enrichment, Playwright-tested interception, open rules engine |
| Innovation | Signature-first (Permit2/Seaport — where drainers actually operate); *meaning* not mechanics; auditable rules instead of black-box AI |
| Impact | Directly prevents the #1 category of retail loss; open source; wallet-agnostic path |

**NON-GOALS — the Building AI must NOT attempt:**
- Publishing to the Chrome Web Store, Firefox, Safari, mobile
- Any backend server, database, user accounts, telemetry, or analytics
- Paid APIs or anything requiring a credit card
- Hardware-wallet flows, `window.web3`-only wallets, WalletConnect (no project IDs)
- Mainnet deployments of demo contracts
- Multi-chain UI switcher (code is chain-configurable; UI shows one chain)
- Rewriting or "improving" prior phases' modules unless a prompt explicitly says so
- Asking the human to write, read, or edit code

---

## B. Technical Spec

### B.1 Architecture

```
┌──────────────────────── Browser tab (dApp origin) ─────────────────────────┐
│ dApp JS ──► window.ethereum / EIP-6963 provider  (PlainSign Proxy)          │
│                      │ intercepts 5 methods; forwards all others instantly  │
│                      │ window.postMessage                                    │
│                      ▼                                                       │
│           entrypoints/content.ts (isolated world)                            │
│           • bridges to background   • mounts Overlay (React, Shadow DOM)     │
│                      │ chrome.runtime.sendMessage                            │
└──────────────────────┼──────────────────────────────────────────────────────┘
                       ▼
┌──────────── entrypoints/background.ts (MV3 service worker) ────────────────┐
│ analyze(AnalysisRequest) → AnalysisResult                                   │
│   1. decoder/   tx calldata · EIP-712 typed data · personal_sign/eth_sign   │
│   2. enrich/    getCode (EOA vs contract) · Blockscout (verified, age)      │
│                 · allowlist (known protocols + their real domains)          │
│   3. simulate/  (optional) Alchemy simulateAssetChanges → balance deltas    │
│   4. risk/      rules.json → score → verdict + reasons                      │
│   5. explain/   templates → summary / beginner / technical                  │
│   cache: chrome.storage.local, 24 h TTL                                     │
└──────────────────────┬─────────────────────────────────────────────────────┘
                       ▼ HTTPS (all keyless except optional Alchemy)
   Public Sepolia RPC · Blockscout Sepolia API · (optional) Alchemy
```

Execution contexts:
- `entrypoints/inject.ts` — MAIN world, `document_start`. No `chrome.*` access.
- `entrypoints/content.ts` — isolated world. Bridges messages, mounts overlay.
- `entrypoints/background.ts` — service worker. All analysis. Stateless except cache.

### B.2 Tech stack (pin these)

| Layer | Choice | Version |
|---|---|---|
| Runtime | Node.js LTS | 20.x or 22.x |
| Package manager | npm (bundled with Node) | — |
| Extension framework | WXT | ^0.19 |
| Language | TypeScript, `strict: true` | ^5.5 |
| UI | React + react-dom | ^18.3 |
| Styling | Tailwind CSS (compiled to a string, injected into Shadow DOM) | ^3.4 (NOT v4) |
| EVM | viem | ^2.21 |
| Unit tests | Vitest | ^2.1 |
| E2E tests | Playwright (`@playwright/test`) | ^1.47 |
| Contracts | Hardhat + @nomicfoundation/hardhat-toolbox-viem, Solidity 0.8.24, OpenZeppelin ^5 | Hardhat ^2.22 |
| Demo dApp | Vite ^5 + React 18 + wagmi ^2 + viem (injected connector only; NO RainbowKit, NO WalletConnect) | — |
| Slides | Marp CLI (markdown → PDF) | latest |
| Hosting (demo dApp) | GitHub Pages via GitHub Actions | — |
| Chain reads | Public Sepolia RPC: `https://ethereum-sepolia-rpc.publicnode.com` (fallback `https://sepolia.drpc.org`); local Hardhat `http://127.0.0.1:8545` (chainId 31337) | — |
| Contract metadata | Blockscout Sepolia REST v2: `https://eth-sepolia.blockscout.com/api/v2/` (keyless) | — |
| Simulation (optional) | Alchemy `alchemy_simulateAssetChanges` on `https://eth-sepolia.g.alchemy.com/v2/<KEY>` | — |

### B.3 Folder structure

```
plainsign/
├── MASTER_SPEC.md  HUMAN_TASKS.md  README.md  LICENSE (MIT)
├── package.json  wxt.config.ts  tsconfig.json  vitest.config.ts  playwright.config.ts
├── tailwind.config.cjs  postcss.config.cjs  .env.example  .gitignore
├── entrypoints/
│   ├── inject.ts            # MAIN-world provider proxy (§B.6)
│   ├── content.ts           # bridge + overlay mount
│   └── background.ts        # message router → analyze()
├── src/
│   ├── types.ts             # ALL shared types (§B.4) — verbatim
│   ├── config/  chains.ts  intercept.ts  allowlist.json  publicRpc.ts
│   ├── lib/     fetchWithTimeout.ts  log.ts  format.ts  shortAddr.ts
│   ├── bridge/  protocol.ts (bigint-safe serialize/deserialize)  ids.ts
│   ├── decoder/ abis/{erc20,erc721,erc1155,permit2,seaport,weth}.ts
│   │            tx.ts  typedData.ts  message.ts  index.ts
│   ├── enrich/  getCode.ts  blockscout.ts  allowlist.ts  cache.ts  index.ts
│   ├── simulate/ alchemy.ts  defaults.ts  index.ts
│   ├── risk/    rules.json  signals.ts  engine.ts
│   ├── explain/ templates.ts  index.ts
│   ├── analyze.ts           # orchestrator with 4 s budget + degraded fallback
│   └── ui/      Overlay.tsx  VerdictCard.tsx  AssetDiff.tsx  Reasons.tsx  mount.ts  styles.css
├── tests/
│   ├── fixtures/{tx,typed,msg,enrich}/*.json
│   ├── unit/**/*.test.ts
│   └── e2e/ mock-wallet.js  fixtures/index.html  interception.spec.ts  serve.js
├── contracts/               # Hardhat project (own package.json)
│   ├── contracts/ DemoNFT.sol  ClaimToken.sol  FakeMint.sol  WETH9.sol
│   ├── scripts/ deploy.ts  fund-and-mint.ts
│   ├── test/*.ts  hardhat.config.ts
│   └── deployments/{31337,11155111}.json  (written by deploy)
├── demo-dapp/               # Vite app (own package.json), deployed to GitHub Pages
│   └── src/ App.tsx  addresses.ts  ...
├── docs/  slides.md  demo-script.md  architecture.md  submission.md  screenshots/
├── .github/workflows/ ci.yml  pages.yml  release.yml
└── scripts/ package-extension.js  (zips .output/chrome-mv3 → dist/plainsign-<ver>.zip)
```

### B.4 Data model — `src/types.ts` (copy verbatim in Phase 0)

```ts
import type { Address, Hex } from "viem";

export type Verdict = "safe" | "caution" | "danger"; // 🟢 🟡 🔴

export type InterceptedMethod =
  | "eth_sendTransaction" | "eth_signTypedData_v4" | "eth_signTypedData_v3"
  | "personal_sign" | "eth_sign";

export interface RawRequest { method: InterceptedMethod; params: unknown[]; } // never mutated

export interface AnalysisRequest {
  id: string; origin: string; chainId: number; from: Address; request: RawRequest;
}

export type IntentKind =
  | "erc20_approve" | "erc20_transfer" | "erc20_transferFrom"
  | "erc721_approve" | "erc721_setApprovalForAll" | "erc721_transfer"
  | "erc1155_setApprovalForAll" | "erc1155_transfer"
  | "permit_erc2612" | "permit2_single" | "permit2_batch" | "permit2_transferFrom"
  | "seaport_order" | "native_transfer" | "contract_deploy"
  | "weth_wrap" | "weth_unwrap" | "swap" | "multicall"
  | "siwe" | "plain_message" | "raw_hash"
  | "unknown_function" | "unknown_typed_data";

export interface Intent {
  kind: IntentKind; method: InterceptedMethod;
  to?: Address; spender?: Address; operator?: Address; token?: Address; recipient?: Address;
  tokenIds?: bigint[]; amount?: bigint; isUnlimited?: boolean; deadline?: number; value?: bigint;
  approved?: boolean;                 // setApprovalForAll flag
  functionName?: string; functionSig?: string; primaryType?: string;
  domain?: { name?: string; verifyingContract?: Address; chainId?: number };
  considerationNearZero?: boolean;    // seaport
  children?: Intent[]; raw: unknown; decodeError?: string;
}

export interface AssetChange {
  kind: "native" | "erc20" | "erc721" | "erc1155"; token?: Address; symbol?: string;
  decimals?: number; tokenId?: bigint; delta: bigint; formatted: string;
}
export interface SimulationResult {
  ok: boolean; reverted?: boolean; revertReason?: string; changes: AssetChange[];
  provider: "alchemy" | "none"; error?: string;
}
export interface AddressInfo {
  address: Address; isContract: boolean; isVerified?: boolean; contractName?: string;
  ageDays?: number; allowlisted?: { protocol: string; domains: string[] }; fetchedAt: number;
}
export interface RiskReason {
  id: string; weight: number; severity: "info" | "warn" | "critical"; title: string; detail: string;
}
export interface RiskResult { score: number; verdict: Verdict; reasons: RiskReason[]; instantVerdict?: Verdict; }
export interface RiskContext {
  request: AnalysisRequest; intent: Intent; simulation: SimulationResult;
  addresses: Record<string, AddressInfo>; now: number;
}
export interface Explanation {
  summary: string; beginner: string[]; technical: string[]; whatCouldGoWrong?: string; source: "template" | "llm";
}
export interface AnalysisResult {
  id: string; intent: Intent; simulation: SimulationResult; risk: RiskResult;
  explanation: Explanation; durationMs: number; degraded?: string;
}

// Bridge messages (all payloads pass through bridge/protocol serialize/deserialize)
export type MainToContent   = { type: "PS_ANALYZE"; payload: AnalysisRequest } | { type: "PS_PING" };
export type ContentToMain   = { type: "PS_DECISION"; id: string; decision: "continue" | "reject" } | { type: "PS_PONG" };
export type ContentToBg     = { type: "PS_BG_ANALYZE"; payload: AnalysisRequest };
export type BgToContent     = { type: "PS_BG_RESULT"; payload: AnalysisResult };
```

### B.5 Internal contracts (module interfaces)

| Module | Signature | Rules |
|---|---|---|
| `decoder/index.ts` | `decode(req: AnalysisRequest): Promise<Intent>` | Never throws; on failure returns `unknown_*` with `decodeError` |
| `enrich/index.ts` | `enrich(addrs: Address[], chainId, origin, deps?): Promise<Record<string,AddressInfo>>` | Parallel, 1500 ms per address, partial results OK, cached 24 h |
| `simulate/index.ts` | `simulate(req): Promise<SimulationResult>` | tx only; returns `{ok:false, provider:"none"}` when no key/timeout |
| `risk/engine.ts` | `evaluate(ctx: RiskContext): RiskResult` | Pure; only consumer of `rules.json` |
| `explain/index.ts` | `explain(intent, sim, risk, addrs): Explanation` | Pure templates |
| `analyze.ts` | `analyze(req, deps?): Promise<AnalysisResult>` | 4000 ms total budget; on timeout/throw → degraded 🟡 result |
| `bridge/protocol.ts` | `serialize(v)`, `deserialize(v)` | bigint ↔ `{__bigint:"123"}` at every boundary |

### B.6 Interception — required behavior of `entrypoints/inject.ts`

1. Runs at `document_start` in MAIN world (`world: "MAIN"` in WXT `defineContentScript`).
2. `INTERCEPTED_METHODS` = the five methods in §B.4.
3. **Legacy path.** If `window.ethereum` already exists → wrap it. Else
   `Object.defineProperty(window,"ethereum",{configurable:true, set(p){real=p}, get(){return real?wrap(real):undefined}})`.
   If a wallet later redefines with `configurable:false` and throws, catch and at
   `DOMContentLoaded` wrap whatever exists.
4. **EIP-6963 path (Phase 6).** Capturing listener on `eip6963:announceProvider`;
   `stopImmediatePropagation()`; re-dispatch same `info` with `provider: wrap(provider)`.
   Dispatch `eip6963:requestProvider` once after installing. Wrap once per provider (WeakMap).
5. `wrap(p)` returns a `Proxy`. `request` trap:
   - non-intercepted → `return p.request(args)` immediately.
   - intercepted → build `AnalysisRequest` (chainId via `p.request({method:"eth_chainId"})`
     or cached `p.chainId`; `from` from params), postMessage `PS_ANALYZE`, await matching
     `PS_DECISION` (60 s timeout → reject).
   - `continue` → `return p.request(args)` with the ORIGINAL `args` object.
   - `reject` → `throw Object.assign(new Error("User rejected the request."), {code:4001})`.
6. `send`/`sendAsync` with an intercepted method route through the same path.
7. All other props (`on`, `removeListener`, `isMetaMask`, `selectedAddress`, `chainId`,
   `enable`, `providers`) pass through bound to the real provider.
8. Expose `window.__plainsign = { version, wrapped: true }` for tests/debugging.
9. Never throw during install. Log once with prefix `[PlainSign]`.

### B.7 Decoder scope

**Transactions (by selector):** ERC-20 `approve`, `increaseAllowance`, `transfer`, `transferFrom`;
ERC-721 `approve`, `setApprovalForAll`, `transferFrom`, `safeTransferFrom` (both overloads);
ERC-1155 `setApprovalForAll`, `safeTransferFrom`, `safeBatchTransferFrom`; Permit2 `approve`,
`permit`, `transferFrom`; WETH `deposit`→`weth_wrap`, `withdraw`→`weth_unwrap`; Uniswap
Universal Router `execute`→`swap` (do not fully decode); Seaport `fulfill*`→`seaport_order`;
`multicall(bytes[])`→ recurse into `children`; empty data + value → `native_transfer`;
no `to` → `contract_deploy`; else `unknown_function` with the 4-byte selector as `functionSig`.
(No external 4byte lookup in MVP.)

**Typed data by `primaryType`:** `Permit` (ERC-2612), `PermitSingle`, `PermitBatch`,
`PermitTransferFrom`, `PermitBatchTransferFrom`, Seaport `OrderComponents` (flag
`considerationNearZero` when offering ERC-721/1155 and total consideration < 1e12 wei),
else `unknown_typed_data` surfacing `primaryType` + `domain`.

**Messages:** `personal_sign` → hex→utf8; parses as SIWE (EIP-4361) → `siwe`; exactly 32
bytes non-utf8 → `raw_hash`; else `plain_message`. `eth_sign` → always `raw_hash`.

`isUnlimited = amount >= 2n**255n`. Permit2 amounts are uint160: unlimited if `>= 2n**159n`.

### B.8 Risk rules — `src/risk/rules.json` (copy verbatim; tune weights only via Phase prompts)

```json
{
  "thresholds": { "danger": 60, "caution": 25 },
  "postRules": { "anyCriticalMinVerdict": "caution" },
  "rules": [
    { "id": "eth_sign", "signal": "isEthSign", "instant": "danger", "severity": "critical",
      "title": "Raw hash signing (eth_sign)", "detail": "This can authorize almost anything. Almost no legitimate app needs it." },
    { "id": "personal_sign_hash", "signal": "isPersonalSignHexHash", "weight": 45, "severity": "critical",
      "title": "Signing an opaque 32-byte hash", "detail": "The message is a raw hash, which could be a disguised transaction or order." },
    { "id": "spender_is_eoa", "signal": "isSpenderEOA", "instant": "danger", "severity": "critical",
      "title": "Permission goes to a personal wallet, not an app", "detail": "Legitimate apps use contracts. Giving a personal wallet permission over your assets is the #1 drainer pattern." },
    { "id": "unlimited_approval", "signal": "isUnlimitedApprovalToUnknown", "weight": 50, "severity": "critical",
      "title": "Unlimited token permission", "detail": "Grants permission to move ALL of this token, now and in the future." },
    { "id": "approval_for_all", "signal": "isSetApprovalForAllToUnknown", "weight": 45, "severity": "critical",
      "title": "Full collection permission", "detail": "Lets this address move every NFT you own in this collection." },
    { "id": "permit_long_or_unlimited", "signal": "isPermitLongOrUnlimited", "weight": 35, "severity": "warn",
      "title": "Long-lived or unlimited permit", "detail": "This permission lasts more than 30 days or has no amount cap." },
    { "id": "permit2_transfer", "signal": "isPermit2TransferFrom", "weight": 40, "severity": "critical",
      "title": "Gasless token transfer signature", "detail": "Once relayed, this signature moves your tokens immediately." },
    { "id": "order_near_zero", "signal": "isMarketplaceOrderNearZero", "instant": "danger", "severity": "critical",
      "title": "Listing your NFTs for ~0", "detail": "This order sells your assets for almost nothing." },
    { "id": "contract_new", "signal": "isTargetYoungerThanDays:7", "weight": 25, "severity": "warn",
      "title": "Contract is less than 7 days old", "detail": "Brand-new contracts are common in scams." },
    { "id": "unverified", "signal": "isTargetUnverified", "weight": 15, "severity": "info",
      "title": "Unverified contract source", "detail": "Nobody can review what this code does." },
    { "id": "domain_mismatch", "signal": "isDomainMismatch", "weight": 25, "severity": "warn",
      "title": "Website doesn't match the protocol", "detail": "This site is not a known domain for the contract it's calling." },
    { "id": "net_outflow", "signal": "isNetOutflowNoInflow", "weight": 40, "severity": "critical",
      "title": "You lose assets and receive nothing", "detail": "Simulation shows only outgoing balance changes." },
    { "id": "sim_reverted", "signal": "didSimulationRevert", "weight": 0, "severity": "info", "forceMin": "caution",
      "title": "Transaction would fail", "detail": "Simulation reverted; you'd likely just lose gas." },
    { "id": "unknown_function", "signal": "isUnknownFunction", "weight": 20, "severity": "warn",
      "title": "Unrecognized action", "detail": "PlainSign can't tell exactly what this function does." },
    { "id": "allowlisted_target", "signal": "isTargetAllowlistedAndDomainOk", "weight": -20, "severity": "info",
      "title": "Known protocol on its official site", "detail": "Target is a recognized contract and this website is expected." }
  ]
}
```

Engine semantics: each `signal` → pure fn in `signals.ts` `(ctx, arg?) => boolean`
(`"name:arg"` passes arg). Sum weights of firing rules, clamp 0–100. Any `instant` fires →
that verdict (danger > caution). `forceMin` raises verdict floor. `postRules.anyCriticalMinVerdict`:
if any firing reason has `severity:"critical"`, verdict ≥ caution. Reasons sorted
critical→warn→info, then |weight| desc. "Unknown" = not allowlisted for this chain.

### B.9 Allowlist seed — `src/config/allowlist.json`

```json
{
  "11155111": {
    "0x000000000022d473030f116ddee9f6b43ac78ba3": { "protocol": "Uniswap Permit2", "domains": ["app.uniswap.org","uniswap.org"] },
    "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": { "protocol": "Uniswap Universal Router", "domains": ["app.uniswap.org","uniswap.org"] },
    "0xfff9976782d46cc05630d1f6ebab18b2324d6b14": { "protocol": "Wrapped Ether (WETH)", "domains": ["*"] },
    "0x0000000000000068f116a894984e2db1123eb395": { "protocol": "OpenSea Seaport 1.6", "domains": ["opensea.io","testnets.opensea.io"] }
  },
  "1": {
    "0x000000000022d473030f116ddee9f6b43ac78ba3": { "protocol": "Uniswap Permit2", "domains": ["app.uniswap.org","uniswap.org"] },
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { "protocol": "Wrapped Ether (WETH)", "domains": ["*"] },
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { "protocol": "USD Coin (USDC)", "domains": ["*"] },
    "0x0000000000000068f116a894984e2db1123eb395": { "protocol": "OpenSea Seaport 1.6", "domains": ["opensea.io"] }
  },
  "31337": {}
}
```
Domain match: origin host equals or is a subdomain of a listed domain; `"*"` matches any.
The local-chain deployment (31337) allowlists nothing; `deployments/*.json` addresses are
never allowlisted (they are the "attacker" demo).

### B.10 Explanation templates — rules

- One template per `IntentKind`. `summary` = ONE sentence, beginner language. Banned words
  in `summary`/`beginner`: approve, spender, operator, calldata, allowance, EOA, msg.sender.
  Use "permission", "this address", "this app", "a personal wallet".
- Counterparty naming: `allowlisted.protocol ?? contractName ?? shortAddr`; append
  " — a personal wallet, not an app" if `!isContract`; " (created N days ago)" if `ageDays < 30`.
- Amounts: `isUnlimited` → "all of your {SYMBOL}, forever"; else formatted with decimals when known.
- Deadlines: relative ("for the next 3 days") if < 365 d else "with no practical expiry".
- `beginner` bullets include simulation deltas when available.
- `technical` always includes `functionSig`/`primaryType`, full addresses, raw amounts, chainId.
- Degraded: "PlainSign could not fully analyze this request. Only continue if you trust this site."
- LLM (stretch only): input is `{ intent-without-raw, simulation.changes, reasons }`; output
  must be JSON `{ summary, beginner[], whatCouldGoWrong }`; validate; on any failure fall
  back to template; 1500 ms timeout; feature-flagged by `VITE_LLM_KEY`; never touches
  `verdict`, `score`, or `reasons[].id`.

### B.11 UI requirements

- `<div id="plainsign-root">` on `document.documentElement`, **closed** Shadow DOM,
  `position:fixed; inset:0; z-index:2147483647`, dark translucent backdrop, centered card
  max-width 480 px, system font stack.
- States: "Analyzing…" (must appear ≤ 100 ms after interception) → Result.
- Result card: colored header (🟢 Safe / 🟡 Caution / 🔴 Danger), `summary`, asset-diff list
  (if any), collapsible "Why?" with reasons, "Beginner / Technical" toggle, buttons
  **Reject** (primary style when danger) and **Continue to wallet**.
- Keyboard: `Esc` = Reject; `Enter` = Continue only when verdict is safe. Backdrop click = Reject.
- Unmount on decision. Re-entrant (second request after first works; no duplicate roots).

### B.12 Environment variables

| Name | Used by | Source | Human task | Required? |
|---|---|---|---|---|
| `VITE_SEPOLIA_RPC` | extension, dapp | default public RPC baked in | none | no |
| `VITE_ALCHEMY_KEY` | extension `simulate/` | Alchemy dashboard | H8 | no (Phase 6 stretch) |
| `VITE_LLM_KEY` | extension `explain/llm.ts` | any LLM provider | H8b (stretch) | no |
| `DEPLOYER_PRIVATE_KEY` | `contracts/` deploy | MetaMask "PS-Deployer" account export | H7 | Phase 5 |
| `ATTACKER_ADDRESS` | `contracts/` deploy, dapp | MetaMask "PS-Attacker" address | H7 | Phase 4 |
| `VICTIM_ADDRESS` | `contracts/` fund-and-mint | MetaMask "PS-Victim" address | H7 | Phase 4 |
| `VITE_DEMO_CHAIN` | dapp | `31337` or `11155111` | set by Building AI | Phase 4 |

`.env.example` at repo root lists all; `contracts/.env` and `demo-dapp/.env` are generated
from it by `npm run env:sync`.

### B.13 Third-party services

| Service | Purpose | Auth | Cost |
|---|---|---|---|
| publicnode / drpc Sepolia RPC | eth_chainId, eth_getCode, eth_call | none | free |
| Blockscout Sepolia API v2 | verified flag, contract name, creation tx → age | none | free |
| Google Cloud Web3 Faucet | Sepolia ETH | Google login | free |
| GitHub + Pages + Actions | repo, CI, demo dApp hosting | GitHub login | free |
| Alchemy (optional) | asset-change simulation | email signup | free tier |

### B.14 Demo flow with sample data

Demo page (`demo-dapp`, styled as a shady "Free Mint" site) on chain `VITE_DEMO_CHAIN`:

| Button | Request the page makes | Expected verdict | Summary (template output) |
|---|---|---|---|
| **Free Mint** | `eth_sendTransaction` → `DemoNFT.setApprovalForAll(ATTACKER, true)` | 🔴 | "This does not mint anything. It gives 0xAb…12 — a personal wallet, not an app — permission to move every NFT you own in Demo Cats." |
| **Claim 1000 CLAIM** | `eth_sendTransaction` → `ClaimToken.approve(ATTACKER, maxUint256)` | 🔴 | "This gives 0xAb…12 — a personal wallet, not an app — permission to take all of your CLAIM, forever." |
| **Sign to verify wallet** | `eth_signTypedData_v4` Permit2 `PermitSingle` {token: ClaimToken, spender: ATTACKER, amount: 2^160-1, expiration: now+10y} | 🔴 | "This signature lets 0xAb…12 — a personal wallet — move all of your CLAIM with no practical expiry, without asking you again." |
| **Sign in** | `personal_sign` SIWE message | 🟢 | "You're signing a login message for localhost. This can't move any assets." |
| **Wrap 0.01 ETH** | `eth_sendTransaction` → `WETH.deposit()` value 0.01 (on Sepolia; on 31337 a local WETH9 is deployed) | 🟢 | "You'll turn 0.01 ETH into 0.01 WETH. Known contract." |
| **Sign hash** (Phase 5, "More tests") | `personal_sign` of a 32-byte hex | 🔴 | "You're being asked to sign an unreadable code. This could authorize anything." |
| **List my NFT for 0** (Phase 5, "More tests") | `eth_signTypedData_v4` Seaport `OrderComponents`, ERC-721 offered for 0 wei | 🔴 | "This lists your Demo Cats #1 for sale for 0 ETH — anyone can take it for free." |

Sample `AnalysisRequest` for Free Mint:
```json
{ "id":"6e1c…", "origin":"http://localhost:5173", "chainId":31337,
  "from":"0xVICTIM", "request":{ "method":"eth_sendTransaction",
  "params":[{ "from":"0xVICTIM", "to":"0xDEMONFT",
  "data":"0xa22cb465000000000000000000000000<ATTACKER 40 hex>0000000000000000000000000000000000000000000000000000000000000001" }] } }
```

---

## C. Phased Build Plan — Master Prompts for the Building AI

Phases: 0 Scaffold → 1 Interceptor + automated e2e → 2 Decoders, rules, templates →
3 Enrichment, orchestrator, overlay (demo moment) → 4 Contracts + demo dApp on local chain →
5 Sepolia deploy + GitHub Pages + signature/message stretch → 6 Simulation, EIP-6963, polish →
7 README, slides, demo script, packaging → S Stretch → X Contingency (Snap pivot).

> Human: copy one fenced block at a time into Codex. Replace only
> `<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>`. Do not edit anything else.

### Phase 0 — Repo & scaffold

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Everything you need is in this prompt and in the file MASTER_SPEC.md at the repo root.
Read MASTER_SPEC.md sections A and B completely before doing anything.

PROJECT CONTEXT
PlainSign is a Chrome Manifest V3 extension (WXT + TypeScript + React) that intercepts
wallet signing requests (eth_sendTransaction, eth_signTypedData_v4/v3, personal_sign,
eth_sign) before the wallet popup, decodes them with viem, enriches counterparties via a
keyless public Sepolia RPC and Blockscout, scores risk from a deterministic rules.json,
and shows a plain-English overlay with Continue/Reject. Windows 11 machine, Node 20/22,
npm, Chrome. No paid services, no backend, no credit cards.

CURRENT STATE
Fresh repo. It contains only MASTER_SPEC.md, HUMAN_TASKS.md and possibly a README stub.

OBJECTIVE
Create the complete project skeleton so that the extension builds, loads in Chrome, and
logs from all three contexts; shared types and the bigint-safe bridge protocol exist and
are unit-tested. Nothing is intercepted yet.

EXACT DELIVERABLES
1. Root npm project with WXT ^0.19, TypeScript strict, React 18, Tailwind 3.4 (postcss),
   viem ^2.21, Vitest ^2, ESLint+Prettier defaults. Scripts: "dev", "build", "test",
   "test:watch", "lint", "typecheck", "package" (scripts/package-extension.js zips
   .output/chrome-mv3 to dist/plainsign-<version>.zip), "env:sync" (copies matching
   keys from root .env into contracts/.env and demo-dapp/.env; create folders if missing).
2. wxt.config.ts: manifest name "PlainSign", description, version 0.1.0, permissions
   ["storage"], host_permissions ["<all_urls>"], icons (generate simple PNG icons 16/48/128
   with a shield glyph via a small node script or embed a base64 PNG — do not ask the human).
3. entrypoints/inject.ts (defineContentScript, matches <all_urls>, runAt document_start,
   world "MAIN") — for now only logs "[PlainSign] inject loaded" and sets
   window.__plainsign = { version: "0.1.0", wrapped: false }.
   entrypoints/content.ts (isolated, document_start) — logs "[PlainSign] content loaded".
   entrypoints/background.ts — logs "[PlainSign] background loaded" and responds to
   {type:"PS_PING"} runtime messages with {type:"PS_PONG"}.
4. src/types.ts copied VERBATIM from MASTER_SPEC.md §B.4.
5. src/bridge/protocol.ts with serialize()/deserialize() (bigint <-> {__bigint:string},
   deep, arrays/objects) + src/bridge/ids.ts (uuid via crypto.randomUUID). Unit tests.
6. src/config/chains.ts (11155111 Sepolia and 31337 Hardhat with rpc urls, names,
   blockscout base for Sepolia only), src/config/intercept.ts (INTERCEPTED_METHODS),
   src/config/publicRpc.ts (viem publicClient factory with fallback transport),
   src/config/allowlist.json VERBATIM from §B.9.
7. src/lib/fetchWithTimeout.ts, log.ts, format.ts (formatUnits helpers), shortAddr.ts. Tests.
8. .env.example listing every variable from §B.12 with comments. .gitignore (node_modules,
   .output, dist, .env, .wxt, coverage, playwright-report).
9. .github/workflows/ci.yml running lint, typecheck, test, build on push.
10. README.md stub with one paragraph and "Load unpacked" steps (full README in Phase 7).
11. MIT LICENSE.

CONSTRAINTS
- Use exactly the stack in MASTER_SPEC.md §B.2. Tailwind 3.4, NOT 4. No RainbowKit,
  no WalletConnect, no backend frameworks.
- Do not create decoder/risk/enrich/ui modules yet beyond empty folders.
- Do not modify MASTER_SPEC.md or HUMAN_TASKS.md.
- Windows environment: use cross-platform npm scripts (no bash-only syntax; use node
  scripts or cross-env/rimraf if needed).

HUMAN INPUTS NEEDED
None in this phase. Never ask the human for code or config edits; if a value is missing,
use a placeholder and list it under HUMAN ACTIONS.

VERIFICATION (run these yourself; fix until all pass)
- npm install
- npm run lint && npm run typecheck   → exit code 0
- npm test                            → all tests pass (protocol, lib)
- npm run build                       → creates .output/chrome-mv3 with manifest.json
- Print the ABSOLUTE path of .output/chrome-mv3 for the human.
Then give the human ONE thing to do: load the unpacked extension (HUMAN_TASKS task H5)
and report whether the extension card in chrome://extensions shows any red "Errors" button.
Success = no Errors button and, on any website, the DevTools console shows
"[PlainSign] inject loaded" and "[PlainSign] content loaded".

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: full file tree (2 levels, excluding node_modules), what works, what is
stubbed, env vars in use, exact commands to run/build/test, absolute path of the built
extension, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- If a reasonable default exists, choose it and note it; do not ask clarifying questions.
- Keep the app buildable at the end; never leave it broken.
- Commit at the end with message "phase 0: scaffold".
- Do not refactor or delete files created by earlier phases (none exist yet).
```

### Phase 1 — Interceptor + automated e2e harness (the risk, first)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely before doing anything; §B.6 is the exact
behavior specification for this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Implement the provider interception layer exactly per MASTER_SPEC.md §B.6 (legacy
window.ethereum path only; EIP-6963 comes in Phase 6), the MAIN→content→background bridge,
and a Playwright e2e harness with a MOCK WALLET so that interception, pass-through,
Continue and Reject are PROVEN automatically without any human. The overlay is a temporary
window.confirm(); the real UI comes in Phase 3.

EXACT DELIVERABLES
1. entrypoints/inject.ts per §B.6 items 1–3 and 5–9: Proxy wrap, WeakMap single-wrap,
   defineProperty setter/getter trap, request/send/sendAsync interception, 60 s decision
   timeout → reject, EIP-1193 4001 error object, window.__plainsign marker with
   wrapped:true and a counter of intercepted calls.
2. entrypoints/content.ts: listens for window "message" events where
   event.source === window and data.type === "PS_ANALYZE"; forwards via
   chrome.runtime.sendMessage({type:"PS_BG_ANALYZE"}) using bridge/protocol serialize;
   on result shows window.confirm(`PlainSign [${verdict}]: ${summary}\n\nContinue to
   wallet?`) and posts PS_DECISION back. Include a 4500 ms fallback: if background does
   not answer, confirm with "PlainSign could not analyze this request".
3. entrypoints/background.ts: handles PS_BG_ANALYZE, waits 300 ms, returns a STUB
   AnalysisResult (verdict "caution", summary "Stub analysis for <method>") — analyze()
   arrives in Phase 3. Keep the service-worker message channel open correctly (return
   true / use sendResponse or promise).
4. tests/e2e/mock-wallet.js: a script injected via Playwright addInitScript that installs
   a fake EIP-1193 provider at window.ethereum implementing eth_chainId (0x7a69),
   eth_accounts / eth_requestAccounts (one fixed address), eth_blockNumber, and records
   every intercepted-method call in window.__walletCalls, returning a fake tx hash /
   signature. It must support an install mode chosen via a query param on the test page:
   "immediate", "delayed" (setTimeout 50 ms), "onload" (DOMContentLoaded) — to cover every
   injection-order race. It must also emit isMetaMask:true and support on()/removeListener().
5. tests/e2e/fixtures/index.html served by tests/e2e/serve.js (plain node http server on
   port 5174): buttons that call window.ethereum.request for eth_sendTransaction,
   eth_signTypedData_v4 (a Permit2 PermitSingle payload), personal_sign, eth_chainId, and
   display the result or error code in a <pre id="out">.
6. playwright.config.ts + tests/e2e/interception.spec.ts using
   chromium.launchPersistentContext with --disable-extensions-except / --load-extension
   pointing at .output/chrome-mv3. Try channel "chromium" with headless true (new headless
   supports extensions); if extensions do not load, fall back to headless:false. Tests
   (each run for all three install modes):
   a. window.__plainsign.wrapped === true and dApp still sees isMetaMask true.
   b. eth_chainId returns 0x7a69 with no dialog and no intercepted-call increment.
   c. eth_sendTransaction: dialog appears (page.on("dialog")) BEFORE the wallet receives the
      call; accepting → wallet receives the IDENTICAL params object (deep-equal), page
      shows the fake hash.
   d. Same with dismiss → wallet receives nothing; page shows error code 4001.
   e. eth_signTypedData_v4 and personal_sign are intercepted; eth_chainId is not.
   f. Two sequential requests both work (re-entrancy).
   Script "test:e2e" builds first then runs Playwright; "playwright install chromium" is
   run by you during setup. Also add script "testpage" that only starts tests/e2e/serve.js.
7. Add e2e job to ci.yml (ubuntu, xvfb-run if headed).

CONSTRAINTS
- Do not mutate the dApp's request params object. Forward the same reference.
- Do not implement decoding, risk, UI, or EIP-6963 in this phase.
- Do not touch src/types.ts.
- MAIN-world script cannot use chrome.*; everything crosses via postMessage.

HUMAN INPUTS NEEDED
None. After your tests pass, the human will do a 5-minute manual check with real MetaMask
(HUMAN_TASKS task H6) using your test page at http://localhost:5174 and paste back a
short report. Design the test page so a non-technical person can do H6: big buttons
("Connect", "Send transaction", "Sign typed data", "Sign message", "Chain id"), a clear
status line, and the error code shown in large text.

VERIFICATION (run yourself; fix until all pass)
- npm run lint && npm run typecheck && npm test → pass
- npm run build → pass
- npm run test:e2e → ALL e2e tests pass in all three install modes. Paste the Playwright
  summary line in your final output.
- Then give the human: (1) the single command `npm run testpage` to start the test page
  server, (2) the URL, (3) instruction to reload the extension in chrome://extensions
  first. Success for the human = clicking "Send transaction" shows a browser confirm box
  BEFORE the MetaMask popup; Cancel makes the page show "error 4001"; OK makes MetaMask
  open.

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is stubbed,
env vars in use, commands to run/build/test/e2e, absolute path of built extension,
which Playwright mode (headless/headed) worked, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions. Note every default chosen.
- Do not refactor Phase 0 files except where this phase requires.
- If the extension fails to load in Playwright after 3 attempts, document precisely what
  fails, keep unit tests green, and report it as a BLOCKER (the human will relay it).
- Keep the app demoable at the end. Commit as "phase 1: interceptor + e2e".
```

### Phase 2 — Decoders, risk engine, explanation templates (pure logic)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely; §B.7, §B.8, §B.10 govern this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Build all pure-logic modules — transaction decoder, typed-data decoder, message decoder,
risk engine, and explanation templates — with comprehensive unit tests and realistic
fixtures. No browser or network involved. Nothing is wired into the extension yet.

EXACT DELIVERABLES
1. src/decoder/abis/*.ts: minimal ABIs (only the functions listed in §B.7) for ERC-20,
   ERC-721, ERC-1155, Permit2, Seaport (fulfillBasicOrder, fulfillOrder,
   fulfillAdvancedOrder — inputs may be abbreviated to tuple types), WETH, and a generic
   multicall(bytes[]).
2. src/decoder/tx.ts: decodeTransaction(tx, chainId): Intent using viem
   decodeFunctionData with selector routing per §B.7, isUnlimited logic, multicall
   recursion into children, native_transfer, contract_deploy, unknown_function.
3. src/decoder/typedData.ts: decodeTypedData(json|string, method): Intent for
   Permit, PermitSingle, PermitBatch, PermitTransferFrom, PermitBatchTransferFrom,
   Seaport OrderComponents (considerationNearZero), unknown_typed_data. Accept params as
   JSON string or object; tolerate both param orders ([address, data] and [data, address]).
4. src/decoder/message.ts: personal_sign → siwe / raw_hash / plain_message per §B.7;
   eth_sign → raw_hash. Include a small SIWE parser (regex-based per EIP-4361 layout;
   extract domain/uri/chainId/expiration).
5. src/decoder/index.ts: decode(req): Promise<Intent> routing by method; never throws.
6. tests/fixtures/tx/*.json (≥ 22): ERC-20 approve limited / unlimited(maxUint256) /
   uint96.max, increaseAllowance, transfer, transferFrom; ERC-721 approve,
   setApprovalForAll true and false, transferFrom, both safeTransferFrom overloads;
   ERC-1155 setApprovalForAll, safeTransferFrom, safeBatchTransferFrom; Permit2 approve,
   permit, transferFrom; WETH deposit, withdraw; Universal Router execute; Seaport
   fulfillBasicOrder; multicall containing an approve; native transfer; contract deploy;
   unknown selector. Encode fixtures with viem encodeFunctionData in a generator script
   (tests/fixtures/generate.ts) so they are correct by construction, and commit the JSON.
7. tests/fixtures/typed/*.json (≥ 9) and tests/fixtures/msg/*.json (≥ 4) covering
   everything in §B.7, including a Seaport order offering an ERC-721 for 0 wei and a
   Permit2 PermitSingle with amount 2^160-1 and expiration now+10 years.
8. src/risk/rules.json VERBATIM from §B.8; src/risk/signals.ts (one pure function per
   signal name, plus a registry map); src/risk/engine.ts implementing §B.8 semantics.
9. src/explain/templates.ts + index.ts per §B.10, with a banned-words unit test that
   scans every summary/beginner output for the banned list.
10. Unit tests: every fixture asserts the full Intent minus raw with toMatchObject; every
    rule has a firing and non-firing test; thresholds 24/25 and 59/60; instant beats
    negative weights; forceMin; anyCriticalMinVerdict; sorting. Snapshot tests for
    explanation summaries of all fixtures. Provide a RiskContext builder helper.
11. Coverage ≥ 90% lines for src/decoder, src/risk, src/explain (vitest --coverage with v8).

CONSTRAINTS
- Pure TypeScript only; no fetch, no chrome.*, no DOM in these modules.
- Do not modify entrypoints/*, src/types.ts, or bridge/*.
- No external 4byte lookup service.

HUMAN INPUTS NEEDED
None.

VERIFICATION (run yourself; fix until all pass)
- npm run lint && npm run typecheck && npm test -- --coverage → all pass, coverage ≥ 90%
  for the three folders; paste the coverage table.
- npm run build → pass (nothing in the extension changed, but confirm).
- Print 5 sample summaries (Free Mint setApprovalForAll to an EOA, unlimited approve to an
  EOA, Permit2 PermitSingle unlimited 10-year, SIWE, WETH deposit) so the human can read
  them and, if they dislike wording, relay changes in the next phase.

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is stubbed,
env vars in use, commands to run/build/test/e2e, coverage numbers, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered steps (likely just "read the 5 summaries and reply
with any wording changes, or 'ok'").
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases. Keep the extension building. Commit as
  "phase 2: decoders, risk engine, templates".
```

### Phase 3 — Enrichment, orchestrator, overlay UI (the demo moment)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely; §B.5, §B.9, §B.11 govern this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Make the extension actually work end-to-end: enrichment (EOA-vs-contract via public RPC,
allowlist, cache), the analyze() orchestrator with a 4 s budget and degraded fallback,
wired into background.ts, and the real React overlay in a Shadow DOM replacing
window.confirm. After this phase, a real dApp request produces a real verdict card.

EXACT DELIVERABLES
1. src/enrich/getCode.ts (viem getCode via config/publicRpc for the request's chainId;
   31337 → http://127.0.0.1:8545), src/enrich/allowlist.ts (domain matching per §B.9 incl.
   "*" and subdomains), src/enrich/cache.ts (chrome.storage.local wrapper, 24 h TTL,
   injectable store for tests, in-memory fallback when chrome.storage is unavailable),
   src/enrich/blockscout.ts STUB returning {} for now (real in Phase 5),
   src/enrich/index.ts: collect addresses from Intent (to, spender, operator, token,
   recipient, children), parallel with 1500 ms per-address timeout, partial results OK.
2. src/simulate/index.ts STUB returning {ok:false, provider:"none", changes:[]} (real in Phase 6).
3. src/analyze.ts: decode → (enrich ∥ simulate) → evaluate → explain; overall 4000 ms
   budget via Promise.race; on timeout/throw → degraded result (verdict caution, reason
   id "analysis_failed", explanation per §B.10 degraded text). Stage timings in
   durationMs and a debug log per stage. Injectable deps for tests.
4. entrypoints/background.ts: replace stub with analyze(); handle service-worker
   wake-ups correctly.
5. src/ui/*: Overlay.tsx, VerdictCard.tsx, AssetDiff.tsx, Reasons.tsx, mount.ts,
   styles.css per §B.11. Tailwind compiled to a CSS string at build time and injected
   into the closed shadow root (WXT: import styles.css?inline). "Analyzing…" state
   rendered immediately on PS_ANALYZE; result state on PS_BG_RESULT; Beginner/Technical
   toggle; keyboard + backdrop handling; unmount on decision; re-entrant.
6. entrypoints/content.ts: replace window.confirm with the overlay; keep the 4500 ms
   fallback path rendering the degraded card.
7. Update tests/e2e/interception.spec.ts: instead of dialogs, locate the overlay via
   page.evaluate on document.getElementById("plainsign-root").shadowRoot (change the
   shadow root to "open" ONLY when a build-time flag VITE_E2E=1 is set; production stays
   closed). Assert: Analyzing state appears < 300 ms; verdict header text; clicking
   Continue forwards identical params; Reject → 4001; Esc → 4001; toggle switches views.
   Because the mock wallet's addresses are not contracts on 31337 and no RPC may be
   reachable in CI, assert verdicts against expected values given a mocked enrich
   (provide an env flag VITE_E2E_MOCK_ENRICH=1 that makes enrich() treat addresses
   ending in "aa" as EOAs and "cc" as contracts, without network).
8. Unit tests for enrich (mocked client/cache), analyze (timeout path, throw path, happy
   path), and UI smoke tests with @testing-library/react (render each state; buttons fire
   callbacks).

CONSTRAINTS
- Do not modify decoder/risk/explain except to fix bugs found while wiring (note any).
- No network calls in unit tests. E2E must pass without internet.
- No inline scripts; MV3 CSP compliant. React must not be loaded into the page's MAIN world.

HUMAN INPUTS NEEDED
None. After tests pass, the human will repeat the MetaMask check (HUMAN_TASKS task H6b)
on your test page and paste back what the card said.

VERIFICATION (run yourself; fix until all pass)
- npm run lint && npm run typecheck && npm test → pass
- npm run build && npm run test:e2e → pass; paste summary
- Manual reasoning check: print the AnalysisResult JSON your analyze() produces for the
  §B.14 "Free Mint" sample request with enrich mocked so ATTACKER is an EOA. Verdict must
  be "danger" with reasons spender_is_eoa and approval_for_all.
- Give the human: `npm run testpage`, the URL, and: "Reload the extension, click 'Send
  transaction'. Success = a PlainSign card (not a browser dialog) appears before MetaMask,
  with a colored header and a 'Why?' section; Reject shows error 4001 on the page."

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is stubbed
(blockscout, simulate), env vars in use, commands to run/build/test/e2e, absolute path of
built extension, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases beyond what wiring requires. Keep e2e green.
- Commit as "phase 3: enrichment, orchestrator, overlay".
```

### Phase 4 — Demo contracts + demo dApp on a local chain (full demo, no faucet needed)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely; §B.12 and §B.14 govern this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Create the demo smart contracts (Hardhat), a local-chain workflow that needs no faucet,
and the shady "Free Mint" demo dApp with the five buttons from §B.14, so the entire demo
video can be recorded against a local Hardhat chain today. Sepolia comes in Phase 5.

EXACT DELIVERABLES
1. contracts/ Hardhat project (hardhat ^2.22, hardhat-toolbox-viem, OpenZeppelin ^5,
   solc 0.8.24, its own package.json). Contracts:
   - DemoNFT.sol: ERC-721 "Demo Cats" (DCAT), public mint(to) free, tokenURI returns a
     data: URI with an inline SVG cat.
   - ClaimToken.sol: ERC-20 "Claim Token" (CLAIM), 18 decimals, public faucet(to) mints 1000,
     plus a decoy claim() that just emits an event.
   - FakeMint.sol: a decoy contract with a payable mint() that emits an event and does
     nothing else (a prop: the drain comes from the dApp requesting setApprovalForAll
     directly — a contract cannot force that).
   - WETH9.sol: standard WETH (used only on 31337; on Sepolia the real WETH is used).
   Tests for all four (hardhat test, viem style).
2. contracts/scripts/deploy.ts: deploys all, writes contracts/deployments/<chainId>.json
   {DemoNFT, ClaimToken, FakeMint, WETH9?, attacker, deployedAt}. Reads ATTACKER_ADDRESS
   from env (for 31337 default to Hardhat account #19 if unset, and print it).
   contracts/scripts/fund-and-mint.ts: on 31337 sends 10 ETH to VICTIM_ADDRESS, mints 2
   DemoNFTs and 1000 CLAIM to it. Root scripts: "chain" (hardhat node), "deploy:local",
   "seed:local", "deploy:sepolia" (Phase 5), "env:sync".
3. demo-dapp/: Vite ^5 + React 18 + wagmi ^2 + viem, injected() connector ONLY. Reads
   VITE_DEMO_CHAIN (31337 default) and imports the matching deployments JSON via
   demo-dapp/src/addresses.ts (generated by a script "dapp:addresses" that copies
   contracts/deployments/*.json into demo-dapp/src/deployments/). Styled like a scammy
   mint page (countdown timer, "1,204 minted", fake testimonials). Buttons per §B.14:
   Free Mint, Claim 1000 CLAIM, Sign to verify wallet (Permit2 PermitSingle typed data
   with Permit2 verifyingContract 0x000000000022D473030F116dDEE9F6B43aC78BA3 even on
   31337), Sign in (SIWE personal_sign), Wrap 0.01 ETH. Each button shows the outcome
   (tx hash / signature / "Rejected (4001)") beneath it. A small "Connect wallet" button
   and network mismatch banner ("Switch MetaMask to <chain name>", with a one-click
   wallet_switchEthereumChain / wallet_addEthereumChain for 31337 using
   http://127.0.0.1:8545, chainId 0x7a69, currency ETH).
4. A single root command "npm run demo:local" that (cross-platform, via a node script
   using concurrently): starts hardhat node, waits for it, deploys, seeds, syncs
   addresses, and starts the dapp on http://localhost:5173. Print clear console lines the
   human can read: "✅ Chain ready", "✅ Contracts deployed", "✅ Victim funded",
   "✅ Demo dApp: http://localhost:5173".
5. Extension: ensure config/chains.ts 31337 works (getCode against localhost) and that
   the WETH9 local address is treated as allowlisted ONLY when it matches the
   deployments file (read it at build time into allowlist for 31337 under protocol
   "Wrapped Ether (WETH, local)"). Do NOT allowlist DemoNFT/ClaimToken/FakeMint.
6. docs/demo-script.md: click-by-click script for the five buttons with the expected
   verdict and the exact summary text produced by the templates.
7. Extend e2e: a Playwright test that runs demo:local headlessly (or starts hardhat node
   + dapp in globalSetup), uses the mock wallet on the demo dApp, and asserts the verdict
   header for all five buttons (🔴🔴🔴🟢🟢). This is the automated proof of the demo.

CONSTRAINTS
- No RainbowKit, no WalletConnect, no analytics.
- Do not modify src/decoder, src/risk, src/explain, entrypoints/inject.ts.
- All scripts must run on Windows PowerShell via npm (node-based; no bash).

HUMAN INPUTS NEEDED
- VICTIM_ADDRESS and ATTACKER_ADDRESS in root .env (HUMAN_TASKS task H7). If missing, use
  Hardhat account #1 as victim and #19 as attacker, print both, and tell the human the
  demo will still work if they import nothing — but they will need to add the local
  network to MetaMask (task H10 explains) and, to see their own wallet as victim, put
  their address in .env and re-run "npm run demo:local".

VERIFICATION (run yourself; fix until all pass)
- cd contracts && npx hardhat test → pass
- npm run demo:local → prints the four ✅ lines; keep it running in a background
  process while you run: npm run test:e2e → all pass including the five-button demo
  test; paste summary.
- npm run lint && npm run typecheck && npm test && npm run build → pass
- Give the human exactly: (1) `npm run demo:local`, (2) HUMAN_TASKS task H10 steps
  (add local network to MetaMask, open http://localhost:5173, connect, click all five
  buttons). Success = 🔴 🔴 🔴 🟢 🟢 in that order and Continue on "Wrap 0.01 ETH" opens
  MetaMask and the tx confirms.

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is stubbed,
env vars in use (and which had defaults applied), commands to run everything, deployed
local addresses, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases. Keep everything demoable. Commit as
  "phase 4: contracts + demo dapp (local chain)".
```

### Phase 5 — Sepolia deployment, GitHub Pages, Blockscout enrichment, message/signature coverage

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely; §B.12, §B.13, §B.14 govern this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Move the demo to public Sepolia (real contract age / verification signals), host the demo
dApp on GitHub Pages so judges can try it, implement real Blockscout enrichment, and
verify personal_sign / eth_sign / Seaport coverage end-to-end. Local-chain mode must keep
working as a fallback.

EXACT DELIVERABLES
1. src/enrich/blockscout.ts (real): GET /api/v2/addresses/{addr} → is_verified, name,
   creation_tx_hash; GET /api/v2/transactions/{hash} → timestamp → ageDays. 1500 ms
   timeout, cached. Only for chains with a blockscout base in config (Sepolia). Unit tests
   with recorded responses (fetch them once now with a real call and commit as fixtures).
2. contracts: "deploy:sepolia" using DEPLOYER_PRIVATE_KEY and the public RPC; after
   deploy, verify DemoNFT and FakeMint on Blockscout Sepolia via hardhat-verify
   configured for Blockscout (keyless), and intentionally leave ClaimToken UNVERIFIED so
   the "unverified" signal shows in the demo. Write deployments/11155111.json. Mint 2
   DemoNFTs + 1000 CLAIM to VICTIM_ADDRESS.
3. demo-dapp: VITE_DEMO_CHAIN switch; on Sepolia, "Wrap 0.01 ETH" targets the real WETH
   (0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14). Vite base path set for GitHub Pages
   (/<repo-name>/). .github/workflows/pages.yml builds demo-dapp with VITE_DEMO_CHAIN=
   11155111 and deploys via actions/deploy-pages. Add a footer link to the extension zip
   in GitHub Releases.
4. Extension polish for signatures/messages: confirm personal_sign SIWE → 🟢, 32-byte
   hex → 🔴 reason personal_sign_hash, eth_sign → instant 🔴; Seaport OrderComponents
   with near-zero consideration → instant 🔴. Add two more buttons to the demo dApp under
   a collapsed "More tests" section: "Sign hash" (personal_sign of a 32-byte hex) and
   "List my NFT for 0" (Seaport OrderComponents typed data, Seaport 1.6 domain). Update
   docs/demo-script.md and the e2e five-button test to seven buttons.
5. Timing: add stage timings to the technical view footer ("decoded 12 ms · enriched
   640 ms · rules 1 ms"). Target total < 2000 ms on Sepolia; cache hits < 200 ms.
6. scripts/package-extension.js → dist/plainsign-0.1.0.zip; a GitHub Actions workflow
   "release.yml" that on tag v* uploads the zip as a Release asset.

CONSTRAINTS
- Never print or log DEPLOYER_PRIVATE_KEY. Read it only from .env / contracts/.env.
- Do not allowlist any demo contract. Do not modify src/risk/rules.json weights.
- If Sepolia RPC is flaky, retry 3× with backoff; if deployment cannot complete, report
  the exact error as a BLOCKER and keep local mode working.

HUMAN INPUTS NEEDED
- DEPLOYER_PRIVATE_KEY, VICTIM_ADDRESS, ATTACKER_ADDRESS in root .env (HUMAN_TASKS H7);
  the deployer must hold ≥ 0.05 Sepolia ETH (H4). If the balance is insufficient, stop
  before deploying and tell the human exactly how much is missing.
- After you push pages.yml, the human must enable GitHub Pages (Source: GitHub Actions)
  — HUMAN_TASKS H9. Tell them the resulting URL pattern.

VERIFICATION (run yourself; fix until all pass)
- npm run lint && npm run typecheck && npm test → pass (incl. blockscout tests)
- npm run deploy:sepolia → prints addresses + Blockscout links; confirm via a live
  Blockscout call that DemoNFT is verified and ClaimToken is not.
- With VITE_DEMO_CHAIN=11155111: build the extension, run the demo dApp locally, and use
  Playwright + mock wallet (chainId 0xaa36a7, victim address set to VICTIM_ADDRESS) to
  assert the seven verdicts and that the Free Mint technical view contains "created 0
  days ago" and the Claim card lists "Unverified contract source".
- npm run build && npm run test:e2e → pass; git push; confirm ci.yml green.
- Give the human: H9 steps, the GitHub Pages URL, and the checklist of seven buttons to
  click with real MetaMask on Sepolia (H10b). Success = 🔴🔴🔴🟢🟢 + 🔴🔴.

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is
stubbed (simulate), env vars in use, all commands, Sepolia addresses + Blockscout links,
Pages URL, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases. Keep local mode working. Commit as
  "phase 5: sepolia, pages, blockscout, signatures".
```

### Phase 6 — Simulation (optional Alchemy), EIP-6963, robustness polish

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely; §B.6 item 4 and §B.5 simulate govern this phase.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Add balance-change simulation (Alchemy, only when a key is present; graceful without),
EIP-6963 provider wrapping so non-MetaMask wallets are covered, and a robustness pass
(service-worker wake-ups, CSP-strict sites, degraded states, performance). The app must
remain fully demoable with or without the Alchemy key.

EXACT DELIVERABLES
1. src/simulate/alchemy.ts + defaults.ts + index.ts: alchemy_simulateAssetChanges for
   eth_sendTransaction on Sepolia only when VITE_ALCHEMY_KEY is set; fill gas
   (0x1e8480), value (0x0), omit nonce; 2500 ms timeout; map changes to AssetChange from
   the perspective of `from` (formatted like "-0.01 ETH", "+0.01 WETH"); never throw.
   Unit tests with recorded responses (if a key is present in .env, record real
   responses for WETH deposit and an over-balance transfer; else write fixtures from the
   documented response shape). AssetDiff renders deltas; net_outflow and sim_reverted
   rules now can fire.
2. entrypoints/inject.ts: EIP-6963 wrapping per §B.6 item 4 (capturing listener,
   stopImmediatePropagation, re-announce wrapped provider with identical info, WeakMap,
   one requestProvider dispatch). Extend mock-wallet.js with an "eip6963" install mode
   that announces instead of setting window.ethereum; e2e asserts the dApp sees exactly
   ONE announcement per uuid and interception works.
3. Robustness: (a) background keeps a keep-alive during analysis; (b) content.ts handles
   "Extension context invalidated" after a reload by showing the degraded card;
   (c) inject.ts tolerates wallets that define window.ethereum non-configurable
   (DOMContentLoaded fallback) — add a mock mode "frozen"; (d) overlay renders correctly
   when the page sets html { overflow:hidden } or uses a fixed header (e2e fixture page
   variants); (e) a per-origin in-memory dedupe so the same request id is never shown
   twice.
4. Performance: cache warm-up of allowlisted addresses on install; total analyze() on a
   cache hit < 300 ms; log a table in debug mode.
5. A hidden extension options page (WXT entrypoint options.html): toggles for "Show
   technical view by default" and "Enable simulation" (if key), plus a "Test overlay"
   button that renders a sample 🔴 card — useful for screenshots.

CONSTRAINTS
- Simulation must be strictly optional; zero behavior change when the key is absent.
- Do not modify rules.json weights; do not allowlist demo contracts.
- Do not break the seven-button e2e.

HUMAN INPUTS NEEDED
- Optional VITE_ALCHEMY_KEY in root .env (HUMAN_TASKS H8). If absent, proceed without it
  and say so.

VERIFICATION (run yourself; fix until all pass)
- npm run lint && npm run typecheck && npm test → pass
- npm run build && npm run test:e2e → pass for install modes immediate/delayed/onload/
  eip6963/frozen; paste summary.
- If VITE_ALCHEMY_KEY is set: run analyze() against the Sepolia "Wrap 0.01 ETH" request
  and print the AssetChange list; expect -0.01 ETH / +0.01 WETH.
- Give the human: reload the extension; on the demo dApp click "Wrap 0.01 ETH" and
  confirm the card now shows the balance changes (only if key set); optionally install a
  second wallet (Rabby) and confirm the connect dialog shows each wallet once.

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, what is
optional/disabled, env vars in use, all commands, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases. Keep everything demoable. Commit as
  "phase 6: simulation, eip-6963, robustness".
```

### Phase 7 — README, slides, demo script, screenshots, submission package

```
ROLE
You are the Building AI for "PlainSign", a hackathon project. You have full authority to
run terminal commands, create/edit files, install npm packages, and run tests in this
repository. The human operator is NON-TECHNICAL: they will never write, read, or edit code.
Read MASTER_SPEC.md sections A and B completely.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Produce every submission artifact: a README a stranger can follow in 5 minutes, a Marp
slide deck (PDF) covering Problem / Solution / Technology / Innovation / Impact, a
timed demo-video script with a shot list, screenshots generated automatically via
Playwright, the packaged extension zip on a GitHub Release, and draft submission text.

EXACT DELIVERABLES
1. README.md: 60-second pitch; 3 screenshots (🔴 Free Mint, 🔴 Permit2 signature, 🟢
   Wrap); "Try it in 5 minutes" (download zip from Releases → chrome://extensions →
   Developer mode → Load unpacked; open the GitHub Pages demo; MetaMask on Sepolia);
   architecture diagram (Mermaid) + link docs/architecture.md; "How the verdict is
   decided" (embed rules.json summary table generated by a script docs:rules);
   "What we intercept and why signatures matter"; test instructions; honest LIMITATIONS
   (heuristics not guarantees; Chrome + MetaMask primary, EIP-6963 best-effort;
   signatures are decoder-based, not simulated; unknown functions default to caution;
   demo contracts on Sepolia); roadmap (revoke button, community drainer lists,
   multi-chain); team; license.
2. docs/architecture.md with the Mermaid diagram and a request-lifecycle sequence diagram.
3. docs/slides.md (Marp; install @marp-team/marp-cli as a devDependency) → docs/slides.pdf
   via "npm run slides". 8 slides: Title · Problem (with the "hex popup" screenshot) ·
   Solution (the 🔴 card) · Live demo placeholder · Technology (architecture) ·
   Innovation (signature-first, meaning-first, open rules) · Impact + honest limits ·
   Roadmap + repo/QR (generate QR PNG of the repo URL with a node lib).
4. docs/demo-script.md updated: 2-minute narration with timestamps, click-by-click,
   including the "raw MetaMask popup" opener (temporarily disable the extension for that
   shot — give the human the exact toggle click), and a 30-second "if a judge asks to
   see the rules" segment opening rules.json on GitHub.
5. docs/screenshots/*.png generated by a Playwright script "screenshots" (uses the
   options-page "Test overlay" and the demo dApp with mock wallet): red-freemint.png,
   red-permit2.png, yellow-unknown.png, green-wrap.png, technical-view.png.
6. docs/submission.md: drafted answers for a typical form — project name, tagline
   (≤ 100 chars), description (≤ 300 words), problem, solution, technology used,
   innovation, impact, what's next, repo URL, demo URL, video URL placeholder; plus a
   90-second verbal pitch script and 10 likely judge questions with plain-language
   answers. Keep MASTER_SPEC.md §A consistent.
7. Version bump to 0.1.0 final, CHANGELOG.md, tag v0.1.0, push tag → release.yml uploads
   dist/plainsign-0.1.0.zip. Confirm the Release page shows the asset and the README
   download link resolves.
8. Final CI green; "npm run verify:all" runs lint, typecheck, unit, build, e2e.

CONSTRAINTS
- No feature work. Do not change extension behavior except fixing a bug that blocks a
  screenshot (note it).
- Do not invent metrics; use "estimated" wording and cite sources only if you can browse
  and verify them; otherwise omit numbers.

HUMAN INPUTS NEEDED
- Team names and the hackathon submission form field list if the human pastes it;
  otherwise use the generic list in deliverable 6 and leave [TEAM NAME] placeholders.

VERIFICATION (run yourself; fix until all pass)
- npm run verify:all → pass; npm run slides → docs/slides.pdf exists; npm run
  screenshots → 5 PNGs exist; git tag v0.1.0 pushed; Release asset present (print URL).
- Read README start to finish and execute its "Try it in 5 minutes" section literally
  against a fresh clone in a temp folder (except the Chrome click steps). Fix anything
  that doesn't match.
- Give the human: (1) open docs/slides.pdf and docs/submission.md, (2) follow
  HUMAN_TASKS H11–H15 (fresh-eyes install test, recording, submission).

END-OF-PHASE OUTPUT FORMAT (print exactly these three headed sections last)
STATE SNAPSHOT: file tree (2 levels, excluding node_modules), what works, links (repo,
Pages, Release zip, slides), all commands, git commit hash.
HUMAN ACTIONS REQUIRED NOW: numbered click-by-click steps with expected result.
BLOCKERS: anything not completed and why (or "None").

RULES
- Choose defaults, do not ask questions; note defaults.
- Do not refactor prior phases. Commit as "phase 7: docs, slides, release".
```

### Phase S — Stretch (only if Phase 7 is done with ≥ 1 day left)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project (full authority over this
repo; human is non-technical). Read MASTER_SPEC.md sections A and B completely.

PROJECT CONTEXT
PlainSign is a Chrome MV3 extension (WXT + TypeScript + React) that intercepts wallet
signing requests before the wallet popup, decodes them with viem, enriches via keyless
public RPC/Blockscout, scores risk from rules.json, and shows a plain-English overlay with
Continue/Reject. Windows 11, Node 20/22, npm, Chrome. No paid services, no backend.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Add ONE stretch feature at a time, in this order, stopping after each to run verify:all
and commit; skip any that would take > 2 hours: (1) "Revoke instead" button on 🔴 cards
for approve/setApprovalForAll that rejects the request and proposes an approve(spender,0)
/ setApprovalForAll(op,false) transaction to the wallet; (2) community drainer list:
fetch a JSON allow/deny list from the repo's GitHub Pages (docs/denylist.json, seeded with
the demo ATTACKER address) with rule "known_drainer" instant danger; (3) optional LLM
rewording behind VITE_LLM_KEY per MASTER_SPEC.md §B.10 last bullet, strictly never
changing verdict/score/reasons, validated JSON, template fallback, with a unit test that
proves an adversarial LLM output cannot alter the verdict.

DELIVERABLES / CONSTRAINTS / VERIFICATION
Each feature: code + unit tests + e2e assertion + one README line. Never modify
rules.json weights; new rules may be appended. verify:all must stay green. Human inputs:
optional VITE_LLM_KEY (HUMAN_TASKS H8b). Do not start a feature you cannot finish and
verify in this session.

END-OF-PHASE OUTPUT FORMAT
STATE SNAPSHOT / HUMAN ACTIONS REQUIRED NOW / BLOCKERS as in previous phases.

RULES
Choose defaults; do not ask questions; do not refactor prior phases; keep demoable;
commit each feature separately as "stretch: <feature>".
```

### Phase X — CONTINGENCY: MetaMask Snap pivot (use ONLY if H6 fails after the relay loop)

```
ROLE
You are the Building AI for "PlainSign", a hackathon project (full authority over this
repo; human is non-technical). Read MASTER_SPEC.md sections A and B completely.

PROJECT CONTEXT
PlainSign analyzes wallet signing requests and shows a plain-English verdict. The Chrome
extension interception path has proven unreliable with real MetaMask on the human's
machine; we are adding a MetaMask Snap shell that reuses ALL existing analysis code.

CURRENT STATE
<<PASTE STATE SNAPSHOT FROM PREVIOUS PHASE HERE>>

OBJECTIVE
Create snap/ (npm workspace) using @metamask/snaps-sdk with endowment:transaction-insight
and endowment:signature-insight. onTransaction/onSignature build an AnalysisRequest, call
src/analyze.ts (bundle-safe: no chrome.* — inject a snap-compatible cache), and render
verdict, summary, asset changes and reasons with Snap UI components (Box, Heading, Text,
Row, Divider, Banner). Set severity "critical" for danger so MetaMask shows the warning
banner. Keep the Chrome extension in the repo as the wallet-agnostic path.

DELIVERABLES / VERIFICATION
snap/ builds with `npx mm-snap build` and serves with `npx mm-snap serve` on port 8080;
jest tests via @metamask/snaps-jest for the Free Mint and Permit2 cases asserting the
rendered text; a demo-dapp "Install PlainSign Snap" button (wallet_requestSnaps to
local:http://localhost:8080). Update README with a "MetaMask Flask" section and
docs/demo-script.md with the Snap flow. verify:all green. Human inputs: install MetaMask
Flask in the dev Chrome profile (HUMAN_TASKS H6x).

END-OF-PHASE OUTPUT FORMAT
STATE SNAPSHOT / HUMAN ACTIONS REQUIRED NOW / BLOCKERS as in previous phases.

RULES
Choose defaults; do not ask questions; do not modify src/decoder, src/risk, src/explain,
src/analyze.ts except to make them bundle in the Snap; commit as "contingency: snap shell".
```

---

## D. Troubleshooting Relay Prompt

Copy this, fill the blanks, and paste it to the Research AI. You will get back a short
"PATCH PROMPT" to paste into Codex.

```
RELAY — PlainSign build issue

PHASE: <number and name, e.g. "Phase 1 — Interceptor">

WHAT I DID: <e.g. "Pasted the Phase 1 prompt; Codex ran for a while; then I ran the
manual MetaMask check on the test page">

WHAT HAPPENED (paste everything Codex printed in its final 3 sections, plus any red
error text, plus what I saw on screen):
<<paste>>

LAST STATE SNAPSHOT (from the previous successful phase):
<<paste>>

Machine: Windows 11, Chrome <version if known>, MetaMask <version if known>.
Please return a PATCH PROMPT for Codex that (a) restates context, (b) targets only this
problem, (c) tells Codex how to verify the fix, and (d) ends with the standard
STATE SNAPSHOT / HUMAN ACTIONS / BLOCKERS sections. Also tell me in plain English
whether I should keep going, wait, or switch to the contingency.
```