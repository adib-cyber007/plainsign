# HUMAN_TASKS.md — PlainSign (for the non-technical operator)

You never touch code. You (1) install a few programs, (2) create free accounts, (3) copy
values into one text file, (4) paste prompts into Codex, (5) click buttons in Chrome and
report what you saw, (6) record a video and submit. Every step below tells you exactly
what to click and what "success" looks like.

Team roles: **Operator** (runs Codex, does H1–H10) · **Presenter** (H11–H15, plus helps
with H3/H4 on Day 1). Swap if you like, but one person owns Codex.

---

## 0. Timeline — 14 days, submission Sat 27 Sept

Adjust "Day 1" to the actual day you start. Submit by the evening of **Day 13 (26 Sept)**.

| Day | Date | Codex phase | Human tasks | Checkpoint |
|---|---|---|---|---|
| 1 | Sun 14 | Phase 0 | H1 install tools · H2 GitHub + repo + spec · H3 wallet · H4 faucet (start — it's slow) · H5 load extension | Extension loads, logs appear |
| 2 | Mon 15 | Phase 1 | H6 real-MetaMask check | Interception proven (automated + your click test) |
| 3 | Tue 16 | Phase 1 fixes if needed · Phase 2 | H6 retest if needed | Decoders/rules tests green |
| 4 | Wed 17 | Phase 3 | H6b overlay check | **GATE:** real card appears before MetaMask. If not → relay → if still not by end of Day 4 → Phase X (Snap) |
| 5 | Thu 18 | Phase 4 | H7 addresses into .env · H10 local demo click-through | All 5 buttons correct on local chain |
| 6 | Fri 19 | Phase 5 | H7 deployer key · H9 enable Pages · H10b Sepolia click-through | Public demo URL works |
| 7 | Sat 20 | Buffer / fixes | Presenter: first dry run of demo script | **MIDPOINT: must have 5-button demo at video-able quality. If not, cut Phase 6 entirely.** |
| 8 | Sun 21 | Phase 6 | H8 Alchemy (optional) · H10c retest | Sim + EIP-6963 or skipped |
| 9 | Mon 22 | Phase 7 | Presenter: read README/slides/submission drafts | All artifacts exist |
| 10 | Tue 23 | Stretch (optional) or fixes | H11 fresh-eyes install (Presenter, other laptop/profile) | Stranger can install in 5 min |
| 11 | Wed 24 | — | H12 record video (2 takes) | Video uploaded (unlisted) |
| 12 | Thu 25 | — | H13 slides + pitch rehearsal · H14 submission form draft final | Everything filled except "submit" |
| 13 | Fri 26 | — | H14 **SUBMIT** · H15 Q&A rehearsal | Submitted, confirmation email saved |
| 14 | Sat 27 | — | Buffer only. Do not change code. | — |

**Cut rules:** Behind by 1 day at Day 7 → skip Phase 6 and Stretch. Behind by 2 days →
also record the video on the local chain (Phase 4) instead of Sepolia; it looks identical.

---

## 1. Task table

| Task ID | When | Task | Est. time | Steps | Expected outcome | Paste into Codex afterward |
|---|---|---|---|---|---|---|
| H1 | Before Phase 0 | Install Node, Git, Chrome, VS Code + Codex | 40 min | §H1 | `node -v` prints v20 or v22 | nothing |
| H2 | Before Phase 0 | GitHub account, create repo, open in VS Code, add the two spec files | 20 min | §H2 | Repo visible on github.com with MASTER_SPEC.md | Phase 0 prompt |
| H3 | Day 1 (anytime) | Chrome dev profile + throwaway MetaMask with 3 accounts | 20 min | §H3 | Three addresses copied into a notes file | nothing yet |
| H4 | Day 1 (start early) | Get Sepolia test ETH | 10 min + waiting | §H4 | PS-Deployer shows ≥ 0.05 SepoliaETH | nothing |
| H5 | After Phase 0 | Load the extension into Chrome | 5 min | §H5 | No red "Errors" button; console shows "[PlainSign] inject loaded" | "H5 done: no errors" or the red text |
| H6 | After Phase 1 | Real-MetaMask interception check on the test page | 10 min | §H6 | Confirm box appears BEFORE MetaMask; Cancel shows 4001 | the 5-line report in §H6 |
| H6b | After Phase 3 | Same check; now a PlainSign card should appear | 10 min | §H6 | Colored card, Why? list, Reject → 4001 | same report + what the card said |
| H7 | Before Phase 4 / 5 | Put your three addresses and the deployer private key in `.env` | 10 min | §H7 | `.env` file saved | "H7 done" |
| H8 | Before Phase 6 (optional) | Alchemy free account + key | 10 min | §H8 | `VITE_ALCHEMY_KEY` in `.env` | "H8 done" or "skipping H8" |
| H8b | Before Stretch (optional) | LLM API key | 10 min | §H8 | `VITE_LLM_KEY` in `.env` | "H8b done" or "skipping H8b" |
| H9 | After Phase 5 pushes | Enable GitHub Pages | 3 min | §H9 | Green check on Actions; demo URL opens | the demo URL |
| H10 | After Phase 4 | Click through the local demo with MetaMask | 15 min | §H10 | 🔴 🔴 🔴 🟢 🟢 | the verdict list you saw |
| H10b | After Phase 5 | Click through the Sepolia demo (public URL) | 15 min | §H10 | 🔴 🔴 🔴 🟢 🟢 + 🔴 🔴 | the verdict list you saw |
| H10c | After Phase 6 | Retest "Wrap" (balance changes shown) | 5 min | §H10 | Card lists "-0.01 ETH, +0.01 WETH" | yes/no |
| H11 | Day 10 | Fresh-eyes install test by the Presenter | 15 min | §H11 | Installed + 🔴 seen in < 5 min from README alone | anything confusing in README |
| H12 | Day 11 | Record the demo video | 90 min | §H12 | 2-minute MP4, uploaded unlisted | the video URL (for docs/submission.md) |
| H13 | Day 12 | Slides check + pitch rehearsal | 60 min | §H13 | Presenter can deliver 90 s without notes | slide wording fixes if any |
| H14 | Day 12–13 | Fill and submit the form | 45 min | §H14 | Confirmation email/screen | nothing |
| H15 | Day 13 | Judge Q&A rehearsal | 30 min | §H15 | Both can answer the 10 questions | nothing |
| H6x | Only if Phase X | Install MetaMask Flask | 10 min | §H6x | Flask icon in toolbar | "H6x done" |

---

## 2. Expanded instructions

### H1 — Install tools (Windows)

1. **Node.js** → https://nodejs.org → click the big **LTS** button → run the installer →
   Next/Next/Install (leave defaults; tick "Automatically install the necessary tools" if
   offered). Open **Start → type "PowerShell" → Enter** and type `node -v` then Enter.
   ✅ Success: prints `v20.x.x` or `v22.x.x`.
2. **Git** → https://git-scm.com/download/win → "64-bit Git for Windows Setup" → run →
   Next through everything (defaults are fine). In a **new** PowerShell: `git --version`.
   ✅ Success: prints `git version 2.x`.
3. **Google Chrome** → https://www.google.com/chrome → install if not present.
4. **VS Code** → https://code.visualstudio.com → Download for Windows → install (tick
   "Add to PATH" if shown).
5. **Codex in VS Code** → open VS Code → left sidebar Extensions icon (four squares) →
   search **"Codex"** (publisher OpenAI) → Install → click the Codex icon in the sidebar →
   **Sign in with ChatGPT**. ✅ Success: Codex chat panel opens and you can type in it.
   - If the OpenAI extension isn't available to your account: Start → PowerShell →
     `npm install -g @openai/codex` → `codex` → follow the sign-in link. You'll then paste
     prompts into that terminal window instead of the VS Code panel. Everything else is
     identical.
6. Tell Codex, in every session, to work with **full auto / "allow all commands"** when
   it asks for permission (choose the least-prompting mode your tool offers).

### H2 — GitHub account, repo, and the two spec files

1. https://github.com → Sign up (or sign in). Verify the email.
2. Top-right **+** → **New repository** → name `plainsign` → Public → tick **Add a README
   file** → License: **MIT** → **Create repository**.
3. Green **Code** button → copy the HTTPS URL.
4. Open VS Code → **Terminal → New Terminal** → type
   `cd $HOME\Documents` Enter, then `git clone <paste URL>` Enter, then
   `cd plainsign` Enter. Then **File → Open Folder** → `Documents\plainsign`.
   (If git asks you to sign in, a browser window opens — authorize it.)
5. **File → New Text File** → paste the entire contents of `MASTER_SPEC.md` (from the
   Research AI) → **File → Save As** → name `MASTER_SPEC.md` inside the `plainsign` folder
   → Save. Repeat for `HUMAN_TASKS.md`.
6. In the VS Code terminal: `git add . ; git commit -m "add specs" ; git push`
   ✅ Success: refresh github.com/you/plainsign — both files are listed.
7. Now open the Codex panel and paste the **Phase 0** prompt from MASTER_SPEC.md §C.

### H3 — Chrome dev profile + throwaway MetaMask

Never use your real wallet for this project.

1. Chrome → click your profile picture (top-right) → **Add** → name it **PlainSign Dev** →
   skip sign-in → Done. Do everything below in this profile window.
2. https://metamask.io/download → **Install MetaMask for Chrome** → Add to Chrome →
   **Create a new wallet** → set any password → write the 12 words in a notes file named
   `throwaway-seed.txt` (you'll delete it after the hackathon) → finish.
3. Rename and create accounts: click the account name at the top → the pencil → rename to
   **PS-Victim**. Then click the account dropdown → **Add account or hardware wallet → Add
   a new Ethereum account** → name **PS-Attacker**. Repeat → name **PS-Deployer**.
4. Enable test networks: MetaMask ⋮ → Settings → Advanced → **Show test networks: ON**.
   Click the network dropdown (top-left) → choose **Sepolia**.
5. For each of the three accounts: select it → click the address under the name (it
   copies) → paste into a file `addresses.txt` as `VICTIM=0x…`, `ATTACKER=0x…`,
   `DEPLOYER=0x…`.
   ✅ Success: `addresses.txt` has three different addresses starting with 0x.
6. Pin the extension: Chrome puzzle-piece icon → pin MetaMask.

### H4 — Sepolia test ETH (start Day 1; faucets are slow)

1. Go to https://cloud.google.com/application/web3/faucet/ethereum/sepolia → sign in
   with any Google account → paste the **PS-Deployer** address → **Receive 0.05 Sepolia
   ETH**. Repeat daily until PS-Deployer has ≥ 0.1 (once per 24 h).
2. Also send some to PS-Victim: in MetaMask select PS-Deployer → **Send** → paste the
   PS-Victim address → 0.03 → Confirm. (Victim needs a little to wrap 0.01 ETH in the demo.)
3. Backups if Google's faucet refuses: https://sepolia-faucet.pk910.de (mining faucet —
   leave the tab open ~30 min), or ask a teammate/friend with Sepolia ETH.
   ✅ Success: MetaMask shows PS-Deployer ≥ 0.05 SepoliaETH.

### H5 — Load the extension into Chrome (after Phase 0, and after every "reload" request)

1. In the PlainSign Dev profile: address bar → `chrome://extensions` → Enter.
2. Toggle **Developer mode** ON (top-right).
3. **Load unpacked** → in the folder picker paste the path Codex printed (it ends with
   `.output\chrome-mv3`) into the address field at the top → Enter → **Select Folder**.
4. ✅ Success: a card "PlainSign" appears with NO red **Errors** button. Open any website,
   press **F12**, click **Console**, look for `[PlainSign] inject loaded` and
   `[PlainSign] content loaded`.
5. **Reloading later:** on the PlainSign card click the circular arrow ↻, then
   hard-refresh the web page (Ctrl+Shift+R).
6. Paste to Codex: `H5 done: no errors, both log lines seen` — or copy the red error
   text and paste that.

### H6 / H6b — Real-MetaMask interception check (10 min)

1. In VS Code terminal: `npm run testpage` → Enter. Leave it running.
2. Reload the extension (H5 step 5). Open http://localhost:5174 in the PlainSign Dev profile.
3. If a "Connect" button exists, click it → MetaMask asks to connect → choose PS-Victim → Connect.
4. Click **Send transaction**.
   - Phase 1: a plain browser pop-up box (grey, with OK/Cancel) must appear **before**
     MetaMask. Click **Cancel**. The page should show `error 4001`.
   - Phase 3+: a **PlainSign card** (colored header, sentence, "Why?") must appear
     before MetaMask. Click **Reject**. Page shows `error 4001`.
5. Click **Send transaction** again → click **OK / Continue to wallet** → MetaMask should
   now open → click **Reject** inside MetaMask.
6. Click **Sign typed data** and **Sign message** → the box/card should appear each time.
7. Click **Chain id** → should show a number instantly with NO box/card.
8. Paste to Codex this 5-line report (fill YES/NO):
   ```
   H6 report — MetaMask <version from MetaMask Settings → About>
   1 Box/card BEFORE MetaMask on Send transaction: YES/NO
   2 Cancel/Reject showed 4001 on page: YES/NO
   3 OK/Continue opened MetaMask: YES/NO
   4 Sign typed data + Sign message intercepted: YES/NO
   5 Chain id instant with no box: YES/NO
   Card text (H6b only): "<copy the sentence>"
   ```
   Any NO → also send the report to the Research AI with the Relay template (MASTER_SPEC §D).

**Day-4 gate:** if H6b is still failing after two relay rounds, paste **Phase X** (Snap)
and do **H6x**.

### H7 — Put addresses and keys into `.env`

1. VS Code → in the file list find `.env.example` → right-click → **Copy** → right-click
   the folder → **Paste** → rename the copy to `.env` (exactly, with the dot).
2. Open `.env`. Replace the values after `VICTIM_ADDRESS=`, `ATTACKER_ADDRESS=`,
   `DEPLOYER_PRIVATE_KEY=` (leave `VITE_ALCHEMY_KEY=` empty unless doing H8).
3. **Private key export (throwaway account only!):** MetaMask → select **PS-Deployer** →
   ⋮ next to the account name → **Account details** → **Show private key** → enter
   password → **Hold to reveal** → copy → paste after `DEPLOYER_PRIVATE_KEY=` (add `0x` in
   front if it isn't there). Save (Ctrl+S).
4. ✅ Success: file saved; `git status` in the terminal does NOT list `.env` (it's ignored).
   Never paste `.env` contents into chat, GitHub, or Codex. Codex reads the file itself.
5. Paste to Codex: `H7 done`.

### H8 / H8b — Optional API keys

**H8 — Alchemy (enables balance-change simulation):**
1. https://www.alchemy.com → Sign up (email + password; no card) → verify email.
2. Dashboard → **Apps → Create new app** → name `plainsign` → Chain: Ethereum → Network:
   **Sepolia** → Create → **API key** → copy.
3. Paste after `VITE_ALCHEMY_KEY=` in `.env` → save. Paste to Codex: `H8 done`.
   If anything demands a card or takes > 15 min, skip it: `skipping H8`.

**H8b — LLM key (Stretch only):** any provider with a free tier and no card; paste after
`VITE_LLM_KEY=` in `.env`. Paste to Codex: `H8b done` or `skipping H8b`.

### H9 — Enable GitHub Pages (after Phase 5 pushes)

1. github.com/you/plainsign → **Settings** → left menu **Pages** → under "Build and
   deployment" set **Source: GitHub Actions** → (no save button needed).
2. **Actions** tab → wait for the "pages" workflow to show a green ✓ (2–4 min). If red,
   click it, copy the red text, relay to the Research AI.
3. Back in Settings → Pages: copy the URL shown ("Your site is live at …").
   ✅ Success: opening that URL shows the fake mint page. Paste the URL to Codex.

### H10 / H10b / H10c — Click-through the demo

**Local (H10):**
1. VS Code terminal: `npm run demo:local` → wait for the four ✅ lines.
2. Add the local network to MetaMask (once): open http://localhost:5173 → click
   **Switch network** banner → MetaMask asks to add "Hardhat Local" → Approve → Switch.
   (Manual fallback: MetaMask → network dropdown → Add network → Add manually →
   Name `Hardhat Local`, RPC `http://127.0.0.1:8545`, Chain ID `31337`, Symbol `ETH`.)
3. Reload the extension (H5 step 5). Refresh the page. **Connect wallet** → PS-Victim.
4. Click the five buttons in order; for each, note the header color, then click **Reject**
   — except on **Wrap 0.01 ETH**: click **Continue to wallet** → MetaMask opens → Confirm.
   Expected: **Free Mint 🔴 · Claim 🔴 · Sign to verify 🔴 · Sign in 🟢 · Wrap 🟢**.
5. If MetaMask complains about "nonce" after restarting the chain: MetaMask → Settings →
   Advanced → **Clear activity tab data**.

**Sepolia (H10b):** same, but open the GitHub Pages URL, MetaMask on **Sepolia**, and also
expand **More tests** → **Sign hash 🔴**, **List my NFT for 0 🔴**.

**H10c:** on Wrap, the card should list balance changes (only if you did H8).

Paste to Codex the seven results, e.g. `H10b: 🔴🔴🔴🟢🟢 + 🔴🔴, wrap tx confirmed`. Any
mismatch → also send a screenshot description to the Research AI with the Relay template.

### H11 — Fresh-eyes install (Presenter, Day 10)

On a different Chrome profile (or laptop) with a fresh throwaway MetaMask on Sepolia:
open the repo README and follow **only** "Try it in 5 minutes" — no help from the
Operator. Time it. Note every sentence that confused you. Paste those notes to Codex:
`H11 notes: …`. ✅ Success: 🔴 card seen within 5 minutes.

### H12 — Record the demo video (Day 11, 90 min)

**Setup:** PlainSign Dev profile, 1080p screen, Chrome zoom **125%** (Ctrl and +), hide
bookmarks bar (Ctrl+Shift+B), close other tabs, Do Not Disturb on. Recorder: press
**Win+G** → Capture → ● Record (records the active window; record Chrome only). Or
https://obsproject.com if you prefer. Mic: laptop mic is fine; speak slowly.

**Shot list (2:00 total) — read docs/demo-script.md for the exact narration:**
| # | Time | Shot | Action |
|---|---|---|---|
| 1 | 0:00–0:10 | Raw MetaMask popup full of hex | Before recording: chrome://extensions → toggle PlainSign OFF. Click Free Mint → MetaMask opens showing hex → hover. Reject. Toggle PlainSign back ON, refresh. |
| 2 | 0:10–0:35 | 🔴 Free Mint | Click Free Mint → card → read the sentence → open Why? → Reject → point at "Rejected (4001)" on page |
| 3 | 0:35–1:00 | 🔴 Permit2 signature | Click Sign to verify → card → read → mention "gasless, most wallets show nothing useful" → Reject |
| 4 | 1:00–1:20 | 🟢 Wrap | Click Wrap → 🟢 card (with balance changes if H8 done) → Continue → MetaMask opens → Confirm |
| 5 | 1:20–1:40 | Technical toggle + rules.json | Click Technical on any card; then switch to the GitHub tab with `src/risk/rules.json` open — "the verdict comes from this file, not from an AI" |
| 6 | 1:40–2:00 | Slide 5 (architecture) | Show the PDF page; closing line |

Do **two full takes**; keep the better. Upload to YouTube (**Unlisted**) or Google Drive
(link sharing: anyone). Paste the URL to Codex: `Video URL: …` so it updates
docs/submission.md and README.

### H13 — Slides + pitch rehearsal (Day 12)

Open `docs/slides.pdf`. Read `docs/submission.md` "90-second pitch". Rehearse until the
Presenter can deliver it in ≤ 95 s without reading. Send any wording changes to Codex as a
list ("Slide 3: change X to Y").

**90-second pitch (say it as-is):**
> Every week, everyday crypto users lose millions — not to hacks, but to clicking
> "Confirm" on something they didn't understand. A wallet shows you hex and a button.
> Drainers exploit that: a "Free Mint" button that actually hands your whole NFT
> collection to a stranger, or a gasless signature that lets someone empty your USDC
> next week, with nothing showing up on-chain today.
>
> PlainSign is a Chrome extension that sits between the website and your wallet. Before
> the wallet even opens, it reads the request, decodes it, checks who's on the other end
> — is it a real app or a personal wallet, how old, is it verified, is this the real
> website — and shows you one plain sentence: "This gives a personal wallet permission
> to take every NFT you own." Red, yellow, or green. Continue or Reject.
>
> Three things make it different. First, it's signature-first: it understands Permit,
> Permit2, and marketplace listings — where modern drainers actually operate and where
> most tools go blind. Second, it explains meaning, not mechanics — for the people who
> are actually getting drained. Third, the verdict comes from an open, readable rules
> file anyone can audit — not from a black box.
>
> It works on any dApp, tested automatically with a real browser, live on Sepolia,
> free, and open source. We'd love to show you a drainer getting caught.

### H14 — Submission form (Day 12–13)

Open `docs/submission.md` — Codex drafted every field (name, tagline, description,
problem/solution/technology/innovation/impact, what's next, links). Copy-paste into the
hackathon form. Required links: GitHub repo URL, demo dApp URL (GitHub Pages), video URL,
slides PDF (upload `docs/slides.pdf` or link to it in the repo). If the form has a field
we didn't predict, ask the Research AI with the field name and character limit.
Submit on **Day 13 (Fri 26 Sept)**. Screenshot the confirmation.

### H15 — Judge Q&A (answers you can give without knowing the code)

1. **"How is this different from Pocket Universe / Wallet Guard / MetaMask's own warnings?"**
   "Those exist and we respect them. Our edge is signature depth — Permit2 and marketplace
   listings — plain-language meaning instead of function names, and a fully open rules
   file. We also work across wallets, not inside one."
2. **"Is it using AI to decide?"** "No. The verdict is deterministic — a weighted rules file
   you can read on GitHub. AI, if enabled, only rewords the sentence and can never change
   the verdict; we have a test proving that."
3. **"What if it says green and it's actually a scam?"** "A green is 'we found no known red
   flags', not a guarantee — we say that in the README and in the UI. The big wins are the
   reds: personal-wallet approvals, unlimited permits, near-zero listings."
4. **"How does it intercept without modifying the wallet?"** "It wraps the provider object
   the website talks to, before the page loads. Non-sensitive calls pass straight through;
   five signing methods pause for analysis. On Continue the original request is forwarded
   byte-for-byte."
5. **"Can a malicious site bypass it?"** "A site could try to grab the provider before us;
   we run at document start and also cover the EIP-6963 discovery path. It's defense in
   depth, not a sandbox — that's an honest limitation."
6. **"Latency?"** "Under two seconds cold, a few hundred milliseconds when cached. The
   'Analyzing' card shows instantly."
7. **"Which wallets and chains?"** "Chrome plus MetaMask is fully tested; other injected
   wallets via EIP-6963 are best-effort. The code is chain-configurable; the demo is on
   Sepolia."
8. **"Privacy?"** "No backend, no accounts, no telemetry. The only data leaving the browser
   is the address lookup to a public RPC and Blockscout."
9. **"How did you test the risky interception part?"** "Automated Playwright tests load
   the real extension into Chromium with a mock wallet, in several injection orders, and
   assert the request is intercepted, forwarded unchanged, or rejected with code 4001."
10. **"What's next?"** "A one-click 'Revoke instead' on red cards, community drainer lists,
    more chains, and a MetaMask Snap version for native integration."

### H6x — MetaMask Flask (contingency only)

Install https://metamask.io/flask in a **new** Chrome profile (Flask must not sit beside
regular MetaMask). Import the throwaway seed from H3. Follow Codex's HUMAN ACTIONS from
Phase X to install the local Snap from the demo page.

---

## 3. Cheat sheet — things you'll type more than once

| Purpose | Where | Type |
|---|---|---|
| Start test page (Phases 1–3) | VS Code terminal | `npm run testpage` |
| Start full local demo (Phase 4+) | VS Code terminal | `npm run demo:local` |
| Stop anything running | that terminal | `Ctrl+C` (twice if asked) |
| Reload extension | chrome://extensions | ↻ on PlainSign card, then Ctrl+Shift+R on the page |
| Run all checks (if Codex asks) | VS Code terminal | `npm run verify:all` |
| Get Codex the state | Codex | copy its last "STATE SNAPSHOT" into the next prompt's placeholder |
| Something failed | Research AI | MASTER_SPEC.md §D Relay template |