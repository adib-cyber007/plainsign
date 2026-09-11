# PlainSign Sepolia demo script

The primary Phase 5 demo runs on public Sepolia at
`https://adib-cyber007.github.io/plainsign/`. The local Hardhat version remains the
no-faucet fallback.

## Prepare the Sepolia demo

1. Download `plainsign-0.1.0.zip` from the repository's latest GitHub Release and
   extract it. In Chrome, open `chrome://extensions`, enable **Developer mode**, choose
   **Load unpacked**, and select the extracted folder.
2. In MetaMask, select **Sepolia**, connect the configured victim wallet, and keep a
   small amount of Sepolia ETH available for the WETH transaction.
3. Open the Pages URL and click **Connect wallet**. The page must show **Sepolia** in
   the header.

## Record the seven requests

The first three requests are deliberately disguised approvals, the next two are safe,
and the two requests under **More tests** are dangerous signatures.

1. Click **Free Mint**. Expect **Danger**. Open **Why?** to show the personal-wallet
   and full-collection warnings. Switch to **Technical** and show `created 0 days ago`
   plus the decoded/enriched/rules timings. Click **Reject**; the page shows
   `Rejected (4001)`.
2. Click **Claim 1000 CLAIM**. Expect **Danger** and the reason **Unverified contract
   source**. Click **Reject**.
3. Click **Sign to verify wallet**. Expect **Danger** because the Permit2 signature
   grants the attacker a long-lived, unlimited token permission. Click **Reject**.
4. Click **Sign in**. Expect **Safe** and a plain SIWE login explanation. Continue only
   for the demo, sign in MetaMask, and confirm the page receives a signature.
5. Click **Wrap 0.01 ETH**. Expect **Safe** because the request targets Sepolia WETH.
   Click **Continue to wallet**, confirm in MetaMask, and wait for the transaction hash.
6. Expand **More tests**, then click **Sign hash**. Expect **Danger** and the reason
   **Signing an opaque 32-byte hash**. Click **Reject**.
7. Click **List my NFT for 0**. Expect **Danger** and the reason **Listing your NFTs
   for ~0**. Click **Reject**.

The expected verdict sequence is **🔴 🔴 🔴 🟢 🟢 🔴 🔴**.

## Local fallback

1. Run `npm run demo:local` from the project folder.
2. Wait for `✅ Chain ready`, `✅ Contracts deployed`, `✅ Victim funded`, and
   `✅ Demo dApp: http://localhost:5173`.
3. Open `http://localhost:5173`, connect MetaMask to **Hardhat Local** (RPC
   `http://127.0.0.1:8545`, chain ID `31337`), and repeat the seven-button sequence.

Any connected local wallet receives demo-only gas automatically. The local WETH
deployment is recognized as the safe wrap target; DemoNFT, ClaimToken, and FakeMint are
never allowlisted.

## Automated verification

- `npm run test:e2e` runs the seven-button local fallback plus interception coverage,
  including an instant-danger `eth_sign` request.
- `npm run test:e2e:sepolia` runs the seven-button page against the committed Sepolia
  deployment with the configured victim mock wallet. It checks live contract age and
  verification signals, a sub-2-second uncached analysis, and a sub-200-ms cache hit.
