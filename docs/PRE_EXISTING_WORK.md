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

The [official FAQ](https://colosseum.com/hackathon#faq) permits earlier code with disclosure and judges work completed during the event. New commits must use actual timestamps. Never backdate or rewrite earlier commits to imply in-window work.
