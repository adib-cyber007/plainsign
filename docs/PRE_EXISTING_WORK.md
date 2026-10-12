# PlainSign development disclosure

Prepared October 10, 2026. Paste this disclosure into the submission's development-history field and link this document.

PlainSign began on September 9, 2026 for a different hackathon that the owner reports was not submitted. The complete prototype predates Crypto World's Fair. The last pre-event commit is `71ac38c751b0c5df70e975708f68fb75e422e864`, dated September 12, 2026. Do not describe the entire project as built during this competition.

## Pre-existing work

- MV3 extension, EIP-1193 interception and best-effort EIP-6963 wallet discovery.
- Transaction, typed-data and message decoders, deterministic JSON risk rules, explanations and verdict UI.
- Sepolia contracts, CatDrop, local demo, optional simulation, automated tests, documentation and release 0.1.0.
- Revoke instead (commit `8330939`), community drainer feed (`ea5b32d`), and optional LLM rewording (`71ac38c`). These are **not new competition features**.

## Work prepared October 10, 2026

- Ethereum mainnet enrichment and RPC configuration in a registry that also owns explorer, WETH and protocol configuration.
- Protection against RPC outages hiding known-drainer evidence, plus a Caution floor for incomplete address checks.
- A wallet-free sample walkthrough using the production decoder, rules and explanations, with simulated metadata clearly labelled.
- Regression tests, read-only mainnet verification, and the competition-specific pitch, business model, recording scripts and submission package.
- Public-build environment isolation and an artifact scan that prevents developer keys entering the release package.

Git commits and the final diff are the source of truth for what was committed. The local deployment files and multicall fixture already had uncommitted changes when preparation began; do not attribute those earlier changes to this work without confirming their history. AI coding assistance was used. The owner should confirm the disclosure, participant contributions, earlier funding, and any other prior development before submitting.

## Work prepared October 11, 2026

- A visible training-demo notice before wallet connection, explicit fictional mint-count labelling, and labelled fictional testimonials.
- A review against the current official rules and FAQ, third-party code/services disclosure, and submission-package updates. Participant eligibility, permissions, funding, registration and published videos remain unconfirmed.
- Full upstream notices for core runtime dependencies, a confirmed solo-participant slide, and captioned presentation/product-demo videos with synthetic narration. Demo footage uses the actual extension with an automated test wallet and explicitly simulated metadata; it is not a real-MetaMask rehearsal.

## Work prepared October 12, 2026

- Redesigned the presentation as eight editable slides with synchronized speaker notes, a PDF review copy and deck downloads on the watch page.
- Replaced the stock synthetic narration with a user-approved local AI clone of Mohamed's recorded voice. Added sentence pauses, local wording/caption checks, updated transcripts and a fresh controlled product-demo capture. Original recordings and model files remain private.
- Updated media packaging and reproduction tools. This is submission preparation, not a new wallet-security capability. Registration, eligibility/rights declarations, a real-MetaMask rehearsal and a portal submission receipt remain outstanding. See the dated publication report for current deployment checks.

The [official FAQ](https://colosseum.com/hackathon#faq) permits earlier code with disclosure and judges work completed during the event. New commits must use actual timestamps. Never backdate or rewrite earlier commits to imply in-window work.
