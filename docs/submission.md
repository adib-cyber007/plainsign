# PlainSign submission draft

Replace **[TEAM NAME]** and **[VIDEO URL]** before submitting. The remaining URLs and copy are ready to paste into a typical hackathon form.

## Form answers

**Project name**<br>
PlainSign

**Tagline (51 characters)**<br>
Understand every wallet request before you sign it.

**Description (under 300 words)**<br>
PlainSign is a Chrome extension that explains Ethereum wallet transactions and signatures before the wallet asks the user to approve them.

A deceptive “Free Mint” can hide a request that lets a personal wallet move every NFT in a collection. Gasless signatures such as Permit2 and Seaport orders can grant equally powerful permissions that someone relays later. Wallet interfaces often expose function names or raw data without explaining the consequence for the user’s assets.

PlainSign pauses supported EIP-1193 requests, decodes calldata and EIP-712 typed data with viem, enriches relevant addresses through public RPC and Blockscout, and applies deterministic rules from an open JSON file. A Shadow DOM overlay presents a Safe, Caution, or Danger verdict with one plain sentence, expected balance changes when optional simulation is available, and the exact reasons behind the verdict. Reject returns standard error 4001. Continue forwards the untouched request to the real wallet.

The project has no backend, user accounts, paid services, analytics, or telemetry. Playwright tests cover interception and the complete seven-request demo across wallet installation modes. PlainSign currently targets Chrome and MetaMask on Sepolia, with best-effort EIP-6963 support for other injected wallets. It is a transparent warning layer rather than a guarantee of contract safety.

**Problem**<br>
Crypto users routinely approve requests whose raw calldata, typed data, or wallet terminology does not reveal the asset-level consequence. Attackers exploit that gap with disguised approvals and signatures that can be relayed later.

**Solution**<br>
PlainSign places a plain-English checkpoint before the wallet popup. It explains what the request permits, shows why the verdict fired, and lets the user reject before the real wallet receives the request.

**Technology used**<br>
Chrome Manifest V3, WXT, TypeScript, React, Shadow DOM, viem, EIP-1193 provider proxying, EIP-6963 discovery, EIP-712 decoding, public Sepolia RPC, Blockscout, optional Alchemy simulation, Vitest, Playwright, Hardhat, GitHub Actions, and GitHub Pages.

**Innovation**<br>
PlainSign treats signatures as first-class security events, translates mechanics into asset consequences, and keeps the decision logic auditable in `rules.json`. The verdict never depends on a black-box language model.

**Impact**<br>
The project gives non-expert users a chance to recognize disguised collection permissions, unlimited token access, opaque hashes, and zero-value marketplace listings before signing. Its open rules and local architecture make the warning understandable and inspectable.

**What’s next**<br>
Add a revoke flow for dangerous permissions, consume community-maintained drainer lists with provenance, and expand to more EVM chains while keeping the no-backend design.

**Team**<br>
[TEAM NAME]

**Repository URL**<br>
https://github.com/adib-cyber007/plainsign

**Live demo URL**<br>
https://adib-cyber007.github.io/plainsign/

**Demo video URL**<br>
[VIDEO URL]

## 90-second verbal pitch

Imagine clicking “Free Mint.” MetaMask opens and shows a confirmation request with data you cannot interpret. Hidden inside is permission for a personal wallet to move every NFT you own.

PlainSign gives you the missing explanation before the wallet opens. It is a Chrome extension that intercepts supported Ethereum transactions and signatures, decodes them, checks the addresses involved, and applies an open set of deterministic rules.

For that fake mint, PlainSign shows Danger and says the request does not mint anything. It grants full collection permission to a personal wallet. Reject stops the request with the standard wallet error.

Signatures matter too. A Permit2 signature can grant long-lived token access without sending a transaction when you sign it. PlainSign treats that as a first-class request. A normal sign-in message receives a safe explanation, while an opaque hash or zero-value NFT listing triggers Danger.

Everything runs locally. There is no backend, telemetry, account, or paid dependency. Public RPC and Blockscout provide optional context, and every verdict reason comes from a JSON file anyone can audit.

PlainSign does not promise perfect security. It gives ordinary users a clear pause, a concrete explanation, and a safer choice before they sign.

## Likely judge questions

### 1. How does PlainSign appear before MetaMask?

The extension wraps the injected EIP-1193 provider used by the page. Supported signing methods pause while PlainSign analyzes the request. The real wallet receives the original request only after the user chooses Continue.

### 2. Can the extension alter my transaction?

Continue forwards the original request object unchanged. Reject sends the standard user-rejection error code 4001. PlainSign does not rewrite the destination, value, or calldata.

### 3. Why focus on signatures as well as transactions?

A signature can authorize a later token transfer or marketplace order. Creating it may not move assets immediately, so users can underestimate its power.

### 4. Is the verdict produced by AI?

No. viem and local decoders identify the request, and deterministic rules in a public JSON file decide the verdict. Templates turn the result into plain language.

### 5. What happens when PlainSign does not recognize a function?

It shows Caution and says the action is unrecognized. The product avoids claiming that an unknown request is safe.

### 6. What data leaves the browser?

PlainSign sends relevant public addresses and transaction data only to configured public chain services for code, metadata, and optional simulation. It has no telemetry, backend, or user account.

### 7. What if RPC, Blockscout, or simulation fails?

Analysis keeps partial results and degrades conservatively. Optional simulation can fail without disabling decoding or the open rules engine.

### 8. Does Safe mean a contract cannot be malicious?

No. Safe means the current decoded request matched known low-risk patterns. PlainSign is a warning layer, not a formal audit or guarantee.

### 9. Which wallets and chains work today?

The primary tested path is Chrome with MetaMask on Sepolia. The extension also implements best-effort EIP-6963 wrapping for other injected wallets, and the code is chain-configurable.

### 10. What would you build next?

A revoke action would turn warnings into remediation. Community drainer lists and additional EVM chains would broaden coverage while preserving auditable rules and local control.
