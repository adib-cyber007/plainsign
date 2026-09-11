---
marp: true
theme: default
paginate: true
size: 16:9
html: true
style: |
  :root { --ink:#f7f9fc; --muted:#aab3c2; --panel:#111827; --line:#40506a; --safe:#27c58a; --warn:#f5b942; --danger:#ff5a68; }
  section { background:#09101c; color:var(--ink); font-family:Inter,Segoe UI,sans-serif; padding:56px 70px; }
  section::after { color:#69758a; font-size:15px; }
  h1 { color:white; font-size:56px; letter-spacing:-.04em; margin:0 0 22px; }
  h2 { color:white; font-size:38px; letter-spacing:-.03em; margin:0 0 22px; }
  p, li { font-size:24px; line-height:1.35; }
  strong { color:white; }
  code { background:#172235; color:#b9d3ff; }
  .eyebrow { color:var(--safe); font-size:18px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
  .sub { color:var(--muted); font-size:26px; max-width:900px; }
  .split { display:grid; grid-template-columns:1fr 1.15fr; gap:48px; align-items:center; }
  .split-even { display:grid; grid-template-columns:1fr 1fr; gap:52px; align-items:center; }
  .shot { display:block; width:100%; max-height:530px; object-fit:contain; border:1px solid var(--line); border-radius:16px; box-shadow:0 24px 70px #0008; }
  .sequence { font-size:38px; font-weight:850; letter-spacing:.08em; margin:28px 0; }
  .danger { color:var(--danger); } .safe { color:var(--safe); } .warn { color:var(--warn); }
  .arch { display:flex; align-items:center; justify-content:center; gap:14px; margin:44px 0 26px; }
  .arch span { border:1px solid var(--line); border-radius:14px; background:var(--panel); padding:25px 20px; font-size:20px; font-weight:750; text-align:center; }
  .arch b { color:var(--safe); font-size:27px; }
  .three { display:grid; grid-template-columns:repeat(3,1fr); gap:34px; margin:36px 0 58px; }
  .three h3 { color:white; font-size:25px; margin:0 0 10px; }
  .three p { color:var(--muted); font-size:22px; margin:0; }
  .qr { width:310px; background:white; padding:12px; border-radius:14px; }
  .repo { color:#b9d3ff; font-size:20px; }
  .small { display:block; clear:both; color:var(--muted); font-size:22px; line-height:1.45; margin:0; max-width:1120px; }
---

<!-- _class: title -->

<p class="eyebrow">Wallet security before approval</p>

# PlainSign

<p class="sub">Understand every Ethereum transaction and signature before you sign it.</p>

---

## Wallet prompts expose data, not consequences

<div class="split">
<div>

A button says **Free Mint**.

The wallet shows raw hex and asks for confirmation.

The hidden request grants permission to move an entire NFT collection.

</div>
<img class="shot" src="./screenshots/hex-popup.png" alt="Representative wallet prompt dominated by raw hex data">
</div>

---

## A plain-English checkpoint before the wallet

<div class="split-even">
<img class="shot" src="./screenshots/red-freemint.png" alt="PlainSign Danger card for Free Mint">
<div>

**Danger** appears before MetaMask.

The sentence names the real permission and the address receiving it.

Reject stops the request with standard wallet error `4001`.

</div>
</div>

---

## Live demo

<div class="split-even">
<div>

<p class="sequence"><span class="danger">● ● ●</span> <span class="safe">● ●</span> <span class="danger">● ●</span></p>

Seven requests cover disguised approvals, Permit2, SIWE, WETH, opaque hashes, and Seaport.

The card explains the consequence before the real wallet receives the request.

</div>
<img class="shot" src="./screenshots/green-wrap.png" alt="PlainSign Safe card for wrapping ETH">
</div>

---

## Technology

<div class="arch">
  <span>dApp<br><small>EIP-1193</small></span><b>›</b>
  <span>Provider proxy<br><small>MV3 MAIN world</small></span><b>›</b>
  <span>Decode and enrich<br><small>viem + public data</small></span><b>›</b>
  <span>Open rules<br><small>deterministic JSON</small></span><b>›</b>
  <span>Overlay<br><small>React + Shadow DOM</small></span>
</div>

<p class="sub">Continue forwards the untouched request. Reject returns error 4001. Optional Sepolia simulation adds expected balance changes.</p>

---

## Innovation

<div class="split-even">
<div>

**Signature-first**<br>
Permit2 and marketplace orders count as asset-risk events.

**Meaning-first**<br>
The lead sentence describes what changes for the user.

**Open rules**<br>
Every score and reason is auditable in `rules.json`.

</div>
<img class="shot" src="./screenshots/red-permit2.png" alt="PlainSign Danger card for a Permit2 signature">
</div>

---

## Impact and honest limits

<div class="three">
<div><h3>Earlier decision</h3><p>Users see the consequence before the wallet confirmation.</p></div>
<div><h3>Clear reasons</h3><p>Each verdict lists the rule that fired and what could go wrong.</p></div>
<div><h3>Local by design</h3><p>No backend, account, paid dependency, analytics, or telemetry.</p></div>
</div>

<p class="small">PlainSign provides heuristics, not guarantees. Chrome and MetaMask are the primary path. EIP-6963 support is best-effort. Signatures are decoded rather than simulated. Unknown requests receive Caution.</p>

---

## Roadmap

<div class="split-even">
<div>

**Revoke dangerous permissions**

**Use community drainer lists with provenance**

**Expand to more EVM chains**

<p class="repo">github.com/adib-cyber007/plainsign</p>
</div>
<img class="qr" src="./assets/repo-qr.png" alt="QR code for the PlainSign repository">
</div>
