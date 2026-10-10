# PlainSign: Crypto World's Fair form copy

Prepared October 10, 2026. Team facts, videos, funding history and registration remain pending with the owner. Match the actual portal's field limits. Read [submission readiness](SUBMISSION_READINESS.md) before pasting.

## Product name and tagline

**PlainSign**

Understand wallet permissions before you sign them.

## Short description

PlainSign is an open-source Chrome extension that explains supported Ethereum transactions and signatures before the wallet asks for approval. It decodes hidden permissions, shows auditable Safe/Caution/Danger verdicts, and lets users reject before the wallet receives the request.

## Product description

A page can promise a “Free Mint” while requesting permission to move every NFT in a collection. Permit2 and marketplace signatures can authorize asset movement later, even when signing appears gasless.

PlainSign pauses supported EIP-1193 requests, decodes transaction calldata and EIP-712 data with viem, and checks public chain context. Deterministic JSON rules produce a verdict, a plain-English consequence, and explicit reasons. Reject returns wallet error 4001. Continue forwards the original request unchanged. Supported dangerous approval transactions can propose a separate zero-permission revocation after rejecting the original.

Ethereum mainnet and Sepolia use network-specific RPC, Blockscout and protocol configuration. A known-drainer match survives an RPC outage; incomplete address checks impose Caution. Optional simulation remains Sepolia-only. The extension has no backend, accounts or telemetry. Optional AI rewording never decides risk and is disabled in the prepared public build.

A new sample walkthrough lets judges compare five requests using the same decoder, rules and explanations without installing anything. Its chain metadata is explicitly simulated. The extension's CatDrop demo exercises real interception with a test wallet on Sepolia.

The project is an inspectable warning layer. Heuristics and best-effort injected-provider interception cannot guarantee that a site or request is safe. The original prototype and its existing features predate this competition; the development disclosure identifies the new work separately.

## Problem and insight

Users need to understand what a request authorizes, not just its function name. An approval and a login can both look like a routine confirmation, while a gasless signature can be reused later. Our product focuses on that moment of decision and makes the underlying rules inspectable.

## Ethereum integration and technology

Ethereum L1 (chain 1) public code reads, contract metadata, WETH and known-protocol configuration; Sepolia test contracts and end-to-end demo. Chrome MV3, WXT, TypeScript, React, Shadow DOM, viem, EIP-1193, best-effort EIP-6963, EIP-712, Blockscout, Vitest, Playwright, Hardhat and GitHub Pages. Optional Alchemy simulation supports Sepolia only.

Select the Ethereum L1 track if offered in the portal. Mainnet evidence is read-only; no mainnet contract deployment or production security audit is claimed.

## What changed during the event

See [PRE_EXISTING_WORK.md](PRE_EXISTING_WORK.md). New preparation work adds mainnet integration, a consolidated chain registry, an RPC-outage warning fix, the sample walkthrough and supporting tests. Revoke instead, the community drainer list, simulation and optional LLM rewording were already implemented before the event. Do not present them as new work.

## Business model

Keep the consumer extension free and the decision rules open. Test a paid wallet/dApp integration package covering an embedded analysis SDK, maintained rule packages, configurable policies and integration support. This is a business hypothesis, with pricing and willingness to pay still unvalidated. No revenue is claimed.

## Target users and distribution

Start with Ethereum users who encounter unfamiliar approvals and with community educators teaching wallet safety. The sample walkthrough and Sepolia demo make adoption easier. Share observed testing results and invite wallet/dApp builders to a focused SDK pilot. Planned next steps: observe five users, record whether they explain each request correctly, measure false alarms and completion time, and seek two design partners. These targets are not current traction.

## Competition and differentiation

Wallets already offer security warnings. PlainSign's proposed value is an independently inspectable layer with explicit JSON rules, signature explanations, a standard rejection path, and a module that can be evaluated without sending assets. We must test whether this adds enough value alongside wallet-native defenses. We do not claim unique detection capability or superiority without comparative testing.

## Market and traction

Initial market: Ethereum wallet users and wallet/dApp teams evaluating request-analysis integrations. No defensible market-size estimate, user count, revenue, partnerships or customer validation is established by this repository. Do not invent numbers. Use real owner-supplied evidence if available.

## Founder-market fit and team

Owner to supply: final team name, each participant's name, background and contribution, location, why this problem matters personally, university affiliation where applicable, and registration confirmation. Add truthful funding history and accelerator availability where the portal asks. The reminder is scheduled for October 11 at 5 PM IST.

## Links and assets

| Field | Value |
| --- | --- |
| Repository | https://github.com/adib-cyber007/plainsign |
| Existing Sepolia demo | https://adib-cyber007.github.io/plainsign/ |
| New sample walkthrough | `review.html` in the prepared site; verify the public URL after deployment |
| Deck | `docs/slides.pdf` |
| Product graphic | `public/icon/128.png` |
| Presentation video | Owner must record/publish a 2-3 minute presentation using `pitch-script.md` |
| Product demo video | Owner must record/publish an at-most-3-minute demo using `demo-script.md` |

## Judge Q&A

**How does it appear before the wallet?** The extension wraps supported injected EIP-1193 requests and pauses them for analysis. Continue forwards the original arguments. Provider interception is best-effort and not a tamper-proof browser security boundary.

**Does AI choose the verdict?** No. Local decoders and JSON rules decide risk. Optional AI can only reword explanation text. The prepared release disables that option and contains no API keys.

**What leaves the browser?** Relevant public addresses and transaction data can go to configured chain services for metadata and optional simulation. The extension fetches the public community list. There is no telemetry or backend account. “Local” does not mean “offline.”

**What happens offline?** Decoding still works. Bundled denylist evidence remains available. Unchecked addresses receive a Caution floor. An established Danger reason is not reduced by an outage.

**Does revocation recover stolen funds?** No. It proposes a separate transaction cancelling a supported token or collection approval. It needs wallet confirmation and gas and cannot undo a prior signature or transfer.

**Does Safe guarantee safety?** No. It means the decoded request has no major warning signs under these heuristics. Signatures are decoded rather than simulated; mainnet simulation is unavailable.

**How much was built for this event?** The September prototype is disclosed in full. The October changes and actual commit timestamps establish the submitted new work.

**What comes next?** Independent security review, observed user tests and demand validation for a wallet SDK pilot.
