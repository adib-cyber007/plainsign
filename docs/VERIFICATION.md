# Submission verification

Checked October 10, 2026 on Windows. Commands ran using the installed Node 24 runtime; CI remains configured for Node 22. No mainnet transactions were sent. Automated wallet tests use the test provider, so a real MetaMask rehearsal remains necessary before recording.

| Check | Result |
| --- | --- |
| ESLint and TypeScript | Pass |
| Unit tests | 190 passing across 29 files |
| Hardhat contracts | 4 passing |
| Browser E2E | 49 passing, including sample walkthrough, 4001 reject, unchanged Continue arguments, revoke, strict CSP and wallet installation modes |
| Demo production build | Pass, emits both `index.html` and `review.html` |
| Pitch deck | 11 pages, rendered to PNG and visually reviewed |
| Read-only mainnet | Pass via dRPC: chain 1, block 26161808, WETH bytecode 3124 bytes |
| Mainnet explorer | Blockscout reports WETH9 as a verified contract |
| Submission package | Version 0.2.0 extension ZIP, static site ZIP, deck, docs, logo and SHA-256 checksums generated |
| Responsive sample walkthrough | Visually reviewed at desktop and 390px mobile width without horizontal overflow |

The mainnet check ran at `2026-10-10T11:43:17.834Z`. The first PublicNode endpoint failed in this environment; the fallback succeeded. The raw report is generated at `output/submission/mainnet-check.json` by `npm run verify:mainnet`. This checks integration reachability and contract identity, not an audit or proof of detection accuracy.

Browser and external-network checks required unsandboxed execution because this environment restricts local browser launch and networking. The successful reruns are the evidence above.

## Reproduce

```powershell
npm ci
npm --prefix contracts ci
npm --prefix demo-dapp ci
npm run lint
npm run typecheck
npm test
npm --prefix contracts test
npm run test:e2e
npm run verify:mainnet
npm run slides
npm run submission:package
```

`submission:package` rebuilds the extension with optional API keys and E2E flags disabled, rebuilds the site for Sepolia, copies the PDF/docs/logo, and creates SHA-256 checksums. Run it **after** E2E/screenshots because those commands build with test settings. Existing local deployment files are preserved separately from the preparation commits.

## Limits and remaining checks

- The sample walkthrough uses the real decoder/rules/templates and explicitly simulated metadata. It does not demonstrate a live wallet connection.
- The existing public Pages site and 0.1.0 release have not yet been replaced by the prepared version. Publish, then verify the new page and download while signed out.
- Confirm the real-MetaMask Sepolia walkthrough, published video durations, team registration, complete owner facts, and portal receipt.
- Security heuristics, provider interception and remote denylist trust still need independent review before production use.
