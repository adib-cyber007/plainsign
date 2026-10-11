# Publishing the two submission videos

Reviewed October 11, 2026. This is a publishing recommendation based on official documentation; no video was uploaded and no portal acceptance was established by this research.

## Colosseum requirements and uncertainty

The [official FAQ](https://colosseum.com/hackathon), under “What is the required information in the submission portal?”, requires a **two-to-three-minute presentation video** and a **product-demo video no longer than three minutes**. Prepare two clearly named videos. The presentation should communicate the product/business; the demo should show how the product works.

The reviewed public FAQ and [Official Rules](https://colosseum.com/legal/Crypto%20World%27s%20Fair%20Hackathon%20Rules.pdf) do not specify YouTube/Vimeo, an accepted URL-provider list, an MP4 codec, or a required founder-on-camera segment. This absence is not confirmation that the portal accepts every URL. Inspect the actual video-field instructions and validation before choosing its final values. If the portal restricts hosts or cannot embed a Pages link, use a supported host; retain the Pages copies as additional evidence.

Section 12 requires English content, appropriate rights/permissions (including names/likenesses), and compliance with third-party video-platform terms. Do not use narration that impersonates an individual or implies unconfirmed endorsement. Verify the final spoken text and every claim before publishing.

## GitHub Pages feasibility and limits

[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) hosts static project sites. Packaging small MP4 assets with the existing site is a practical implementation option, subject to browser playback checks and the limits below; GitHub's reviewed documentation does not promise Colosseum compatibility.

| Constraint | Official limit |
| --- | --- |
| Published Pages site | 1 GB maximum |
| Pages source repository | 1 GB recommended limit |
| Pages bandwidth | 100 GB/month soft limit; rate limiting can occur |
| Pages deployment | Times out after 10 minutes |
| Pages builds | 10/hour soft limit; custom Actions workflows exempt from this build-rate limit |
| Git file push | Warning above 50 MiB; files above 100 MiB blocked |
| Browser repository upload | At most 25 MiB per file |

Sources: [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and [large-file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github). [Git LFS cannot be used with Pages sites](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage). Do not mistake the separate Actions upload-archive allowance for the smaller published-site limit.

Aim for each clip below 25 MiB while keeping UI text readable; that target is a convenience recommendation, not a Colosseum rule. Two 20 MB clips viewed fully together 1,000 times transfer roughly 40 GB before other traffic (an illustrative estimate, not a quota guarantee). Pages is suitable for modest judging traffic; a specialist video host is preferable for large-scale streaming. Keep the site within Pages' project-hosting purpose and service terms.

## Links and deployment layout

The existing [Pages workflow](../.github/workflows/pages.yml) deploys `demo-dapp/dist` on `master`; [Vite configuration](../demo-dapp/vite.config.ts) uses `/plainsign/`. Files must reach that deployed output, not merely exist in `output/submission`.

Recommended proposed layout (these are **planned paths, not verified live URLs**):

- `https://adib-cyber007.github.io/plainsign/presentation.html`: title, runtime, disclosure, embedded presentation player, direct MP4 fallback and transcript.
- `https://adib-cyber007.github.io/plainsign/product-demo.html`: the same structure for the product demo.
- `https://adib-cyber007.github.io/plainsign/videos/presentation.mp4` and `.../videos/product-demo.mp4`: direct media URLs.

A watch page offers the judge context and visible disclosures. A direct MP4 identifies the media asset and is a useful fallback, but playback/download behavior and portal embedding must be tested. Use separate URLs for the separate form fields. Prefer a watch page only if the actual portal accepts it; otherwise use its documented provider/format. Add `controls` and `playsinline`, avoid autoplay, and provide a readable transcript/captions. Browser-friendly H.264/AAC MP4 with metadata positioned for progressive playback is an implementation recommendation, not a requirement found in the reviewed hackathon sources.

## Honest recording disclosure

Neither reviewed public source explicitly mandates a label named “synthetic narration” or forbids automated test-wallet footage. Nevertheless, disclose both prominently in the video and watch page to prevent a misleading impression:

> Synthetic narration. Product footage uses an automated test wallet on [actual network]. This demonstrates PlainSign's request interception and warnings; it is not a real-MetaMask rehearsal or a mainnet transaction.

Use only the network actually recorded. If showing the wallet-free walkthrough instead, say it uses simulated chain metadata and no wallet connection. Do not describe automated local tests as live Sepolia/mainnet wallet behavior. Identify representative wallet illustrations as illustrations. These are prudent transparency recommendations, not quoted additional rules or assurance that administrators will accept the recording. Owner review and a real-MetaMask rehearsal remain valuable validation.

## Final checks

After deployment, open both watch pages and both MP4s while signed out; confirm HTTP success, audible English narration, readable UI, correct durations, seeking/playback on desktop and mobile, and no private tabs, keys, account identifiers or notifications. Check portal validation/preview using the exact proposed links. Keep the media paths stable through judging. Publication and final submission remain separate actions from preparing these files.

## Recording source and local reproduction

The committed clips use `docs/video-narration.json`, `docs/slides.md` and the real extension with the test provider in `tests/e2e/mock-wallet.js`. On Windows with Microsoft Zira Desktop, FFmpeg/ffprobe and Playwright Chromium installed:

```powershell
powershell -File scripts/render-narration.ps1
npx marp docs/slides.md --images png --allow-local-files --output output/video-build/slide.png
npm --prefix demo-dapp run build
npm run videos:record
npm run submission:package
```

The recorder writes the two MP4s, ASS captions and a demo timeline. The committed WebVTT files, posters and readable transcripts accompany this recording; refresh them from that timeline if narration or scenes change. Recording builds the extension with test flags; always run `submission:package` afterwards to restore a public build with test flags and optional API keys disabled. Recheck durations, caption timing and playback after any recording change.
