# Try PlainSign in 90 seconds

Open the [wallet-free walkthrough](https://adib-cyber007.github.io/plainsign/review.html). No login, wallet or funds are needed. Its public-chain metadata is simulated and labelled; decoding, risk rules and explanations use the production modules.

1. Select **Free Mint**. Read the collection-wide permission, expand **Why?**, then choose **Reject**. The preview explains error 4001 and that the wallet would not receive the request.
2. Compare **Verify wallet** with **Sign in**. The Permit2 example authorizes later token movement; a readable login message has a different consequence.
3. Compare **Wrap ETH** with **Imitation WETH** in the 0.2.1 candidate. They share the same function selector, but only the registered WETH destination gets the wrap explanation. The imitation receives Caution.
4. Choose **Inspect this sample request** to read the input, or **Technical** for decoded details. Follow **Read the risk rules** to inspect the decision logic.

The last two additions are part of the local 0.2.1 update until published. The accepted submission originally linked the five-request 0.2.0 walkthrough.

## See real interception

The [submitted product demo](https://youtu.be/4_deIAYTzSo) shows the actual extension with an automated test wallet and simulated metadata. Reject returns 4001; Continue forwards the original request unchanged. No assets move in that recording. The [submitted pitch](https://youtu.be/FY_4VIk0aSY) explains the product and business hypothesis.

For an interactive extension check, install the [published release](https://github.com/adib-cyber007/plainsign/releases/latest), refresh the [Sepolia training demo](https://adib-cyber007.github.io/plainsign/), and connect an empty test wallet. Use Sepolia and reject risky examples. See the [README setup](../README.md#try-it-in-5-minutes). Chrome with MetaMask is the primary path; automated test-provider coverage does not establish a real-MetaMask rehearsal.

## Evidence and scope

| What to assess | Evidence |
| --- | --- |
| Functionality and UX | Concrete permission explanations, visible reasons, standard rejection and unchanged forwarding; [verification](VERIFICATION.md) |
| October engineering work | Mainnet chain registry, outage handling, wallet-free walkthrough and final decoder/error fixes; [development disclosure](PRE_EXISTING_WORK.md) |
| Inspectability and composition | [Open JSON rules](https://github.com/adib-cyber007/plainsign/blob/master/src/risk/rules.json), [decoder](https://github.com/adib-cyber007/plainsign/tree/master/src/decoder), [architecture](architecture.md), MIT license and [upstream notices](THIRD_PARTY.md) |
| Business viability | Free consumer extension; proposed paid wallet/dApp integration with maintained rules and support. Demand, pricing and distribution remain unvalidated. |
| Next proof | Observe five users explaining permissions and test two integration pilots. These are targets; no customers, revenue or security effectiveness metrics are claimed. |

The September prototype is disclosed. Risk verdicts are heuristics, provider interception is best-effort, and signatures are decoded rather than simulated. Mainnet integration is read-only enrichment; simulation is optional and Sepolia-only. An independent security review is still needed before production use.
