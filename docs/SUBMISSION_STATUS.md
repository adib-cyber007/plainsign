# PlainSign submission status

Updated October 12, 2026.

**Submitted: Colosseum project 17231, entered for judging.** The saved organizer receipt shows October 12 at 6:22 AM PDT, equivalent to **6:52 PM IST**. This document records the saved receipt; it is not a fresh authenticated portal check.

| Submitted field | Saved value |
| --- | --- |
| Sole entrant | Mohamed Adib, student at Sri Venkateswara College of Engineering |
| Live product | https://adib-cyber007.github.io/plainsign/review.html |
| Pitch video | https://youtu.be/FY_4VIk0aSY — 1:45, within the portal's two-minute limit |
| Product demo | https://youtu.be/4_deIAYTzSo — 1:59, within the three-minute limit |
| Source | https://github.com/adib-cyber007/plainsign |
| Receipt | https://colosseum.com/arena/projects/17231/submission#submission-status — account access may be required |

Registration and the eligibility, rights and funding declarations are complete according to the owner. The saved handover records no significant outside funding, AI/tool disclosure and Madhav Krishna's polishing contribution; Mohamed is the sole entrant. These declarations do not replace an organizer eligibility decision. Student status is disclosed; official university sponsorship is not claimed.

## Product update

**[Extension 0.2.1 is published](https://github.com/adib-cyber007/plainsign/releases/tag/v0.2.1)**, and the updated [public walkthrough](https://adib-cyber007.github.io/plainsign/review.html) is deployed. It fixes lookalike WETH decoding, UTF-8-decodable hash signing and warnings being lowered after an analysis failure. The walkthrough adds an imitation-WETH comparison and inspectable request JSON. [PR #4](https://github.com/adib-cyber007/plainsign/pull/4) passed Node 22 CI before merging; release and Pages jobs passed. Anonymous download, GitHub asset digest and the six public examples were verified October 12. See [verification](VERIFICATION.md) and [change history](../CHANGELOG.md).

`npm run submission:package` prepares a versioned local bundle at `output/submission-0.2.1/`; `npm run submission:audit` checks its integrity. The final handover includes the exact downloaded public extension, its verified checksum and a separate publication report. Rebuilding produces a new local package; that command alone does not publish it. The original receipt and submitted package remain in ignored `output/submission-2026-10-12/`; personal declarations, screenshots and raw portal exports are excluded from public packaging.

The saved portal receipt says team, project details, videos, profiles and survey are locked. Before the deadline, only the live-product link, access instructions and additional judge notes remain editable. Any newly published product improvements should be described accurately in those allowed fields. Do not attempt a second entry or rewrite the accepted submission.

The [official cutoff](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf) is October 13, 2026 at **12:29 PM IST** (October 12 at 11:59 PM Pacific). The recorded demo uses an automated test wallet and simulated metadata; a real-MetaMask rehearsal remains unverified. Independent security review and observed user tests remain next steps.
