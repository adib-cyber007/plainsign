# PlainSign demo video script

Target runtime: **2:00**. Record at 1080p in the dedicated PlainSign Chrome profile. Use a throwaway MetaMask account on Sepolia. Close personal tabs and notifications before recording.

## Before recording

1. Extract the latest release ZIP and load it from `chrome://extensions` with **Developer mode** on.
2. Open [the public CatDrop demo](https://adib-cyber007.github.io/plainsign/) and connect the throwaway wallet on Sepolia.
3. Open [`src/risk/rules.json` on GitHub](https://github.com/adib-cyber007/plainsign/blob/master/src/risk/rules.json) in a second tab for optional judge questions.
4. Set browser zoom to 90% if the full card does not fit. Hide bookmarks and close DevTools.

## Two-minute narration and shot list

| Time | Screen and exact clicks | Narration |
|---:|---|---|
| 0:00-0:12 | Open `chrome://extensions`. On the PlainSign card, click the blue on/off toggle so it turns **gray**. Return to CatDrop, refresh, and click **Free Mint**. Hold on the raw MetaMask request with its hex data. Click **Reject** in MetaMask. | “This page promises a free NFT. The wallet gives me a confirmation button and raw data, but it does not explain that the request can hand over my whole collection.” |
| 0:12-0:22 | Return to `chrome://extensions`. Click PlainSign’s gray toggle so it turns **blue**. Click the circular **Reload** arrow on its card. Return to CatDrop and press **Ctrl+Shift+R**. | “PlainSign adds a warning layer before the wallet. It runs locally as a Chrome extension and does not need an account or backend.” |
| 0:22-0:45 | Click **Free Mint**. Pause on the red **Danger** header and summary. Expand **Why?**. | “The same button now stops here first. PlainSign decodes setApprovalForAll and tells me, in plain English, that a personal wallet would gain permission to move every NFT I own.” |
| 0:45-0:52 | Click **Reject**. Point to `Rejected (4001)` on the page. | “Reject returns the standard wallet error, so the site behaves normally and MetaMask never opens.” |
| 0:52-1:12 | Click **Sign to verify wallet**. Hold on the red card, then expand **Why?**. | “PlainSign also checks signatures. This Permit2 request looks gasless, but it grants a long-lived, unlimited token permission that can be relayed later.” |
| 1:12-1:20 | Click **Reject**. | “That matters because no on-chain transaction appears when I create the signature.” |
| 1:20-1:38 | Click **Sign in**. Hold on the green card, then click **Reject** to keep the take moving. | “A normal sign-in message gets a green explanation because it cannot move assets. PlainSign distinguishes a login from an asset permission.” |
| 1:38-1:53 | Click **Wrap 0.01 ETH**. Show the green card and any expected balance changes. Click **Reject** for a faucet-free recording, or Continue only if the wallet has Sepolia ETH. | “A known WETH wrap is also safe. When optional simulation is available, the card can show the expected ETH and WETH balance changes.” |
| 1:53-2:00 | End on the card, then show the repository URL in the address bar. | “The rules are open JSON, every reason is visible, and the project is open source. PlainSign helps people understand before they sign.” |

Expected core verdicts: **Danger, Danger, Safe, Safe** for Free Mint, Permit2, Sign in, and Wrap.

## If a judge asks to see the rules (30 seconds)

| Time | Screen and clicks | Narration |
|---:|---|---|
| 0:00-0:08 | Open the prepared GitHub tab at `src/risk/rules.json`. | “The verdict does not come from a black-box model. This JSON file is the source of truth.” |
| 0:08-0:20 | Use **Ctrl+F**, type `approval_for_all`, press Enter, and highlight its title, detail, and weight. | “For example, full-collection permission to an unknown address adds a critical reason. The explanation shown to the user comes directly from this rule and the decoded request.” |
| 0:20-0:30 | Scroll briefly to `allowlisted_target`, then return to the README rules table. | “Known protocols on their real domains can reduce risk. Anyone can audit the rule, test it, and propose a change.” |

## Recording recovery notes

- If the PlainSign card does not appear after re-enabling it, reload the extension card again and hard-refresh CatDrop.
- If MetaMask opens before PlainSign during the raw opener, that is expected because PlainSign is disabled for that shot.
- If the wallet is on the wrong network, select Sepolia, refresh CatDrop, and reconnect.
- If Wrap lacks test ETH, reject from PlainSign; the green verdict is enough for the recording.
