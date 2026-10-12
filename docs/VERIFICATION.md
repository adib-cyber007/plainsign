# Submission verification

## October 12 media revision

- Replaced the eleven-slide pitch with eight native editable slides and current speaker notes. Rendered slides were visually reviewed; package/layout/import checks passed. Updating the notes preserved all eight inspected render hashes. The PDF uses those same renders.
- Mohamed selected a free local voice clone and approved its short preview. The second of his two saved recordings supplied a clean 15-second reference. All sixteen narration sections were generated locally; source recordings and model files remain ignored and excluded from public assets.
- Local Whisper recognition checked the generated wording and aligned matching English caption cues. Caption reports bind timestamps to each selected audio hash. Automated recognition is not a claim of complete human listening review.
- Presentation: 164.718 seconds; product demo: 118.600 seconds. Both are H.264/AAC 1920×1080, preserve voice pitch/speed, and visibly disclose AI voice cloning. WebVTT captions and readable transcripts match the revised narration.
- Fresh demo capture asserted Danger for collection approval and Permit2, Safe for sign-in and WETH, error 4001 after Reject, and zero forwarded wallet requests after rejecting Free Mint. The actual extension ran with an automated test wallet and simulated metadata, visibly labelled; no assets moved.
- Production extension/site packaging and its sensitive-value audit passed. The package preserves the verified public 0.2.0 extension checksum. ESLint, root TypeScript, demo TypeScript and Python syntax checks passed. Both revised watch pages passed audio-enabled playback, middle/end seeking, loaded captions and no-overflow checks at 1280px and 390px. Encoded audio mean levels were -18.9/-19.1 dBFS, with peaks at -1.4 dBFS. PDF and PPTX files are marked binary to preserve their bytes through Git checkout.
- Final deployment, playback and CI evidence is recorded in the dated submission package’s publication report. Registration, eligibility/rights declarations, real-MetaMask rehearsal, portal URL acceptance and the submission receipt still require completion.

## October 11 update

- ESLint and the demo's TypeScript check passed after the training notice changes. The existing seven-request demo E2E passed: Danger, Danger, Danger, Safe, Safe, Danger, Danger.
- The training notice appeared at the top on 1280px desktop and 390px mobile, without horizontal overflow.
- Owner confirmed solo entrant Mohamed Adib, student at Sri Venkateswara College of Engineering. The deck's final slide was updated and visually reviewed.
- Created H.264/AAC 1920x1080 presentation (168.75 seconds, approximately 3.1 MB) and product-demo (149.48 seconds, approximately 9.9 MB). Both have synthetic narration, burned captions and optional WebVTT captions/transcripts. Selected encoded frames were visually reviewed.
- The recording asserted Danger for collection approval/Permit2, Safe for sign-in/WETH, and zero forwarded wallet calls after Reject. Actual extension code ran with an automated test wallet and simulated chain metadata, explicitly labelled; no real assets moved.
- Core runtime license text is collected into extension/site notices during submission packaging. Personal eligibility, funding and asset/code provenance still need owner confirmation.
- Local watch pages passed video metadata, playback and seeking checks for both clips, with no horizontal overflow at 390px. Desktop/mobile layouts were visually reviewed. Encoded audio is present at mean -20.3 dBFS, with peaks below -2 dBFS. Root TypeScript and ESLint passed after the recording tools were added.
- [CI for the complete preparation](https://github.com/adib-cyber007/plainsign/actions/runs/38138008824) and [the merged application code](https://github.com/adib-cyber007/plainsign/actions/runs/38148717163) passed on Node 22.
- [Release 0.2.0](https://github.com/adib-cyber007/plainsign/releases/tag/v0.2.0) is public. Anonymous extension download succeeded; SHA-256 `ee99a0fc5c663b6d1169419e58def298aa9425121768992a3fb538c9d509ffb5` matches GitHub's asset digest.
- The first Pages deployment failed because the sample walkthrough imports root decoder/UI files but the job installed only demo dependencies. The repair installs both root and demo dependencies, matching successful CI. Check the final package's publication report for deployment and public-playback results.

## October 10 baseline

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
| Public artifact audit | Pass: no developer secret values, E2E key, `.env` files or sourcemaps in the extension ZIP; site includes both pages/logo/denylist; checksums match |
| Remote CI on Node 22 | [Passed for commit ae38794](https://github.com/adib-cyber007/plainsign/actions/runs/38050002598) |

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

WXT's dotenv expansion can restore developer values over empty-string overrides. The package command uses non-empty whitespace that runtime key readers trim to disabled, then scans both generated asset trees for sensitive values from local environment files before creating the public package. A failing scan stops packaging without printing the secret.

## Limits and remaining checks

- The sample walkthrough uses the real decoder/rules/templates and explicitly simulated metadata. It does not demonstrate a live wallet connection.
- Verify the deployed Pages site and 0.2.0 release download while signed out; see the final package's publication report for the latest results.
- Confirm the real-MetaMask Sepolia walkthrough, published video durations, team registration, complete owner facts, and portal receipt.
- Security heuristics, provider interception and remote denylist trust still need independent review before production use.
