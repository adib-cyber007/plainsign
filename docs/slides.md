# PlainSign eight-slide pitch

The submission deck is [the editable PowerPoint](plainsign-pitch.pptx), with [a PDF review copy](slides.pdf). It replaces the earlier eleven-slide Marp deck; earlier versions remain in Git history. Speaker notes follow [human-narration.json](human-narration.json).

## Design and story

1. The hidden permission behind “Free Mint.”
2. PlainSign explains a collection approval before the wallet.
3. Permit2 permission compared with a login message.
4. Decoder, chain context, deterministic rules and user decision.
5. Disclosed September prototype and October additions.
6. Free consumer extension and proposed paid integration model.
7. Limits, independent security review and observed user tests.
8. Wallet-free judge walkthrough and solo entrant details.

The deck uses native editable text in Segoe UI, an ivory/green palette and actual PlainSign sample cards. Eight slides were rendered and visually inspected. PPTX package, layout and import checks passed. The PDF contains those inspected slide renders.

## Reproduce

Run `npm run slides` to create a new validated PPTX and eight PNG renders in `output/pitch-v2/`. The builder uses the Codex bundled presentation runtime. Set `PLAINSIGN_RUNTIME_ROOT` and `PLAINSIGN_PRESENTATION_SKILL` for other installations. `PLAINSIGN_PITCH_REVISION` sets a unique output suffix; do not reuse a finalized revision. The PDF exporter is `scripts/presentation/export_pdf.py` and requires the bundled Python dependencies.

Review all rendered slides before copying final PPTX/PDF assets into `docs/` and `demo-dapp/public/`. Voice cloning and recording are documented in [VOICE_CLONE.md](VOICE_CLONE.md). The older Zira/Marp recording scripts are historical tooling and do not reproduce the current videos.
