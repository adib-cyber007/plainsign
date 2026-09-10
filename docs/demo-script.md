# PlainSign local demo script

This is the five-click Phase 4 recording path. It runs entirely on the local Hardhat
chain, so it needs no faucet and spends no real funds.

## Start the demo

1. In the PlainSign project folder, run `npm run demo:local`.
2. Wait for all four green lines: `✅ Chain ready`, `✅ Contracts deployed`,
   `✅ Victim funded`, and `✅ Demo dApp: http://localhost:5173`.
3. In MetaMask, select **Hardhat Local** (RPC `http://127.0.0.1:8545`, chain ID
   `31337`, currency `ETH`). The page's **Switch network** button can add it for you.
4. Open `http://localhost:5173`, click **Connect wallet**, and connect the victim wallet.

If `VICTIM_ADDRESS` and `ATTACKER_ADDRESS` are absent, the command prints and uses
Hardhat account #1 as the victim and account #19 as the attacker. To use your own
wallet as the funded victim, set its address in the root `.env` and restart the command.
Any wallet connected on chain 31337 also receives local-only demo gas automatically, so
the five-button flow still works without importing a Hardhat account.

## Record the five requests

The abbreviated default attacker shown below is `0x8626…1199`. When a custom attacker
is configured, PlainSign displays that address instead.

1. Click **Free Mint**. PlainSign must show **Danger** with this exact summary:
   “This gives 0x8626…1199 — a personal wallet, not an app — permission to move every
   NFT you own in this collection.” Expand **Why?** to show the personal-wallet and
   full-collection warnings, then click **Reject**. The page shows `Rejected (4001)`.
2. Click **Claim 1000 CLAIM**. PlainSign must show **Danger** with this exact summary:
   “This gives 0x8626…1199 — a personal wallet, not an app — permission to take all of
   your tokens, forever.” Click **Reject**; the page shows `Rejected (4001)`.
3. Click **Sign to verify wallet**. PlainSign must show **Danger** with this exact
   summary: “This signature lets 0x8626…1199 — a personal wallet, not an app — move all
   of your tokens, forever with no practical expiry.” Click **Reject**; the page shows
   `Rejected (4001)`.
4. Click **Sign in**. PlainSign must show **Safe** with this exact summary: “You're
   signing a login message for localhost.” For the H10 click-through, click **Reject**
   and confirm `Rejected (4001)`. The automated test separately continues this request
   and verifies that the dApp receives a signature.
5. Click **Wrap 0.01 ETH**. PlainSign must show **Safe** with this exact summary:
   “You'll turn 0.01 ETH into the same amount of WETH.” Click **Continue to wallet**,
   confirm in MetaMask, and wait for the transaction hash beneath the button.

The expected verdict sequence is **🔴 🔴 🔴 🟢 🟢**. The first three requests are
deliberately disguised approvals; the final two are ordinary login and local WETH
operations.
