# Record PlainSign in your own voice

**Latest choice:** Mohamed requested a free voice clone. Use [the single-sample workflow](VOICE_CLONE.md) for that. The steps below remain available for a fully human narration.

The redesigned pitch has eight slides and a conversational script in its speaker notes. Its focus is the hidden permission behind “Free Mint,” followed by the working product, disclosed event work and proposed business model. The editable deck is [plainsign-pitch.pptx](plainsign-pitch.pptx), with [slides.pdf](slides.pdf) as the review copy.

## Record short takes

1. From the repository, run `node scripts/presentation/studio.mjs`.
2. Open **http://127.0.0.1:5185** in Brave, Chrome or Edge.
3. Choose Presentation. Read each section once, press **Record this take**, then allow microphone access in the browser. Speak to one person, with small pauses. Aim for the suggested time rather than rushing.
4. Press **Stop**, listen, and **Save this take**. You can record a replacement at any time. Every saved version stays on your computer.
5. Complete the eight presentation takes, then choose Product demo and record its eight sections.

Use a quiet room, keep a consistent distance from the microphone, and avoid background music. A phone voice memo is also fine: provide the original audio file and the section numbers. Speak naturally; small imperfections are better than a forced announcer voice. If you paraphrase, keep the permissions, test disclosures and limitations accurate. Captions will need to match your actual words.

Presentation targets total about 2 minutes 37 seconds. The final presentation must be 2–3 minutes. The separate demo must stay under 3 minutes. Actual recorded durations determine the final timing.

Saved recordings live in `output/human-audio/`, which Git ignores. The recorder binds only to this computer and does not upload recordings to an external service. No voice model or clone is created.

## Make review copies

After all takes for a video have been saved:

```powershell
node scripts/presentation/compose.mjs --check
node scripts/presentation/compose.mjs
node scripts/presentation/compose.mjs --demo --check
node scripts/presentation/compose.mjs --demo
```

FFmpeg and FFprobe must be available. The demo also uses the project's installed Playwright browser and builds the extension with its isolated test wallet and simulated metadata. It checks the Reject result and wallet-call count during capture. The capture build is for recording; make a normal production build before packaging a release.

The compositor balances volume and applies a mild filter to low-frequency noise. It preserves the voice's pitch and speaking speed. It times slides and fresh demo footage to the saved takes. It writes new review files under `output/human-videos/` and does not replace the published videos. Review pronunciation, timing, actual spoken words and disclosures before updating public transcripts, captions, videos and the final submission package.

## Current status

- Eight redesigned slides and speaker notes are ready locally. Each slide has been rendered and visually inspected. The PowerPoint is editable; the PDF uses the inspected slide renders.
- The latest choice is a free local voice clone. Two reference takes have been saved; the second was selected after local recording-level, transcription and pacing checks. Its 11–26-second section produced a short cloned preview. Mohamed approved the short clone preview. All sixteen narration sections and both replacement videos are now generated. Cloned narration must be described as AI-generated speech.
- The replacement videos are 2:45 and 1:59. They use a disclosed AI voice clone, not live human narration. Original recordings and model files remain private.
- Participant registration and the remaining eligibility/rights declarations still need Mohamed's confirmation before submission.
