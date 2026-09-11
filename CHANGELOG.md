# Changelog

All notable changes to PlainSign are documented here.

## 0.1.0 - 2026-09-11

### Added

- Chrome MV3 interception for Ethereum transactions, typed data, personal messages, and raw hash signing.
- viem-based decoding, public RPC and Blockscout enrichment, optional Sepolia simulation, and deterministic JSON risk rules.
- Plain-English Safe, Caution, and Danger overlay with beginner and technical views.
- Local and Sepolia demo flows, automated unit and browser tests, release packaging, and GitHub Pages deployment.
- Submission README, architecture guide, generated screenshots, Marp PDF deck, demo script, and submission draft.

### Fixed

- Unknown functions and unknown typed data now explicitly floor the verdict at Caution, matching the documented conservative behavior.
