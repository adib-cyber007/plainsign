# PlainSign: free local voice cloning

Mohamed requested cloning his own voice on October 12, 2026 and asked for a free option. The selected approach is [Chatterbox Nano](https://huggingface.co/ResembleAI/chatterbox-nano), an MIT-licensed English voice-cloning model from Resemble AI. It runs locally and needs no paid account or API key. The smaller model suits this laptop's 4 GB NVIDIA GPU and can also run on CPU. Quality must be judged from Mohamed's actual sample.

## Record one sample

Open **http://127.0.0.1:5185/?mode=clone**. Record about 30–45 seconds in your natural voice, with no music or other speakers. Stop, listen, and save the take. Tell me when it is saved. You do not need to record all sixteen narration sections.

Use your normal speaking voice. Read the guide naturally or explain the idea in your own words. Keep the microphone a consistent distance away. The original sample remains in the ignored `output/human-audio/` directory. Local inference uses a clean 15-second section of that sample as its reference. Audio stays on this computer.

## Setup and preview

The isolated environment is `output/voice-clone/venv/`. Project and system Python packages are unaffected. Source is pinned to Chatterbox commit `5de7a54aa4e5e2baadb0182dde554908b48b85c2`; model weights are pinned to revision `71ccd1d0081b430592cea481f4307e764e07bc64`. The downloader checks every file against its upstream hash and saves the revision and hashes in `output/voice-clone/model-revision.json`. The source and model downloads use the network; generating speech uses the local computer.

```powershell
uv venv --python 3.11 output/voice-clone/venv
uv pip install --python output/voice-clone/venv/Scripts/python.exe --torch-backend cu124 "git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2"
& output/voice-clone/venv/Scripts/python.exe scripts/presentation/clone_voice.py --prepare
& output/voice-clone/venv/Scripts/python.exe scripts/presentation/clone_voice.py
```

The last command requires a saved sample and generates only a short preview. `--sample PATH` accepts an explicitly supplied recording instead. `--start SECONDS` chooses a cleaner reference section; otherwise the recorder manifest's selected `referenceStart` is used, or zero if none is set. `--cpu` is available if GPU memory is insufficient. `--engine-check` tests the engine's stock voice and deliberately labels its output **not Mohamed's voice**.

Listen to the preview for resemblance, accent, skipped words and natural pacing. A clone still produces AI-generated speech and may sound artificial. If needed, try another clean section before generating the full narration. Retain the model's built-in watermark.

## Generate review videos

```powershell
& output/voice-clone/venv/Scripts/python.exe scripts/presentation/clone_voice.py --generate
& output/voice-clone/venv/Scripts/python.exe scripts/presentation/captions.py
node scripts/presentation/compose.mjs --cloned
node scripts/presentation/compose.mjs --cloned --demo
```

Generated speech lives in ignored `output/cloned-audio/`. New videos go to `output/cloned-videos/`. The compositor preserves vocal pitch and speaking speed, checks durations, and includes an AI voice-clone disclosure on both videos. Review the actual speech, captions and disclosures before replacing public media. The replacement videos use this workflow; the original microphone recordings and model files are excluded from public assets.

The model's [official source and examples](https://github.com/resemble-ai/chatterbox) document local installation and reference-audio conditioning. The [model card](https://huggingface.co/ResembleAI/chatterbox-nano) identifies the MIT license and built-in watermarking. The setup retains upstream licensing in the isolated installation; include appropriate attribution when redistributing those components.

## Validation on October 12, 2026

The pinned model files passed hash verification. Local CUDA generation and reference-audio conditioning both passed on this laptop, with Hugging Face and Transformers loading set to offline. The conditioning check used a 10-second generated stock voice reference and produced a non-silent 5.48-second, 24 kHz mono WAV. It is explicitly labelled **not Mohamed's voice** in the filename and adjacent provenance JSON. No participant recording was used or uploaded. The recorder's microphone controls and single-sample mode passed browser checks; lint, formatting and Python syntax checks passed.

Mohamed subsequently saved two real samples. The second was selected using local recording-level checks, sentence timing and a more complete recognition of the provided script. A clean 15-second section beginning at 11 seconds was retained as the reference. Both originals remain intact. The selected reference produced a 10.92-second cloned preview; local recognition recovered its intended message. Reports and timestamps are in the ignored `output/voice-clone/take-review/` directory. Automated recognition does not establish perceptual voice resemblance or natural delivery.

The optional local transcription check used [OpenAI Whisper](https://github.com/openai/whisper), an MIT-licensed tool, with its `base.en` checkpoint verified against the official download hash. It ran locally; the recordings were not uploaded. Mohamed approved the short preview. All sixteen narration sections were then generated with sentence pauses. Local recognition checked the final audio, and caption reports bind each timing file to the selected audio hash. The replacement presentation is 164.718 seconds; the demo is 118.600 seconds. Recognition is an automated wording/timing check, not a claim of human listening review of every sentence.

For the optional caption check, install `openai-whisper==20250625` in the same isolated environment. Run `captions.py --prepare` once to download the official `base.en` checkpoint; subsequent transcription is local. The current encoded videos preserve speaking speed and vocal pitch, include visible AI-clone disclosures, and ship matching WebVTT captions and readable transcripts.
