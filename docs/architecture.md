# PlainSign architecture

PlainSign runs entirely inside a Chrome Manifest V3 extension. It has no backend, account system, analytics, or telemetry. The extension reads only supported wallet requests and public chain metadata needed for the verdict.

## Components and trust boundaries

```mermaid
flowchart TB
  subgraph TAB[Browser tab at the dApp origin]
    DAPP[dApp JavaScript]
    PROXY[Provider proxy in MAIN world]
    BRIDGE[Content bridge in isolated world]
    UI[React overlay in Shadow DOM]
    DAPP -->|EIP-1193 request| PROXY
    PROXY -->|window.postMessage| BRIDGE
    BRIDGE --> UI
  end

  subgraph EXT[PlainSign extension]
    BG[MV3 background service worker]
    DEC[Decoder: viem + bundled ABIs]
    ENR[Enrichment: RPC + Blockscout + allowlist]
    SIM[Optional Sepolia simulation]
    RISK[Deterministic rules.json engine]
    EXP[Plain-English templates]
    CACHE[chrome.storage.local, 24-hour metadata cache]
    BG --> DEC --> ENR --> SIM --> RISK --> EXP
    ENR <--> CACHE
  end

  BRIDGE -->|chrome.runtime message| BG
  EXP -->|AnalysisResult| BRIDGE
  PROXY -->|Continue sends original args| WALLET[Real wallet provider]
  PROXY -->|Reject returns EIP-1193 error 4001| DAPP
  ENR --> RPC[Public Sepolia RPC]
  ENR --> BLOCKSCOUT[Blockscout Sepolia API]
  SIM -. only when enabled and keyed .-> ALCHEMY[Alchemy simulation]
```

The MAIN-world proxy can see the provider that a dApp uses, but it has no `chrome.*` access. The isolated content script is the bridge and owns the overlay. The background service worker performs analysis so page code cannot call internal modules directly.

## Request lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant App as dApp
  participant Proxy as PlainSign provider proxy
  participant Content as Content bridge + overlay
  participant Worker as Background worker
  participant Public as Public RPC / Blockscout
  participant Wallet as Real wallet

  App->>Proxy: request(method, original params)
  alt method is not intercepted
    Proxy->>Wallet: request(original args)
    Wallet-->>App: result or wallet error
  else supported transaction or signature
    Proxy->>Content: PS_ANALYZE via postMessage
    Content-->>App: show Analyzing overlay
    Content->>Worker: PS_BG_ANALYZE
    Worker->>Worker: decode intent
    par public enrichment
      Worker->>Public: code and contract metadata
      Public-->>Worker: partial metadata or timeout
    and optional transaction simulation
      Worker->>Public: simulate when enabled
      Public-->>Worker: balance changes or graceful failure
    end
    Worker->>Worker: evaluate open rules and explain
    Worker-->>Content: AnalysisResult
    Content-->>App: show Safe, Caution, or Danger
    alt user rejects
      Content-->>Proxy: reject
      Proxy-->>App: EIP-1193 error 4001
    else user continues
      Content-->>Proxy: continue
      Proxy->>Wallet: request(the same original args)
      Wallet-->>App: result or wallet error
    end
  end
```

## Analysis stages

| Stage | Input | Output | Failure behavior |
|---|---|---|---|
| Decode | Original EIP-1193 method and parameters | Intent such as NFT permission, Permit2 signature, SIWE, or unknown | Returns an unknown intent; never throws to the page |
| Enrich | Relevant addresses, chain, and page origin | Contract/EOA status, verification, age, known protocol/domain | Keeps partial results and uses cached values when available |
| Simulate | Sepolia transaction and optional Alchemy key | Expected asset changes or revert status | Returns unavailable; analysis continues |
| Risk | Intent, metadata, and simulation | Score, verdict, triggered reasons | Pure deterministic evaluation of `rules.json` |
| Explain | Intent and risk result | Beginner and technical wording | Local templates only |

## Security properties

- The proxy forwards unsupported methods without opening the overlay.
- Continue forwards the original request unchanged.
- Reject uses the standard user-rejection code `4001` so dApps handle it normally.
- Bridge serialization preserves `bigint` values without evaluating page-controlled code.
- Strict CSP pages do not need injected inline scripts.
- Analysis degrades to Caution when the background worker or enrichment cannot complete safely.
- Address metadata is cached locally for 24 hours; PlainSign sends no telemetry.

## Known boundaries

PlainSign provides a warning layer, not a proof of contract safety. Chrome and MetaMask are the primary demo environment. EIP-6963 wrapping is best-effort, signature requests are decoder-based rather than simulated, and the demo contracts use Sepolia test assets.
