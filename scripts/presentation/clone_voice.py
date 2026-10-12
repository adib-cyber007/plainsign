"""Free local voice cloning for PlainSign. Requires Mohamed's recorded sample."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time
import wave

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "output/voice-clone"
WORK.mkdir(parents=True, exist_ok=True)
# Keep dependencies, model downloads, samples and generated media in this workspace.
os.environ["HF_HOME"] = str(WORK / "hf-cache")
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["DO_NOT_TRACK"] = "1"
# The downloader below uses explicit public URLs; model loading stays offline.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
MODEL = "ResembleAI/chatterbox-nano"

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--prepare", action="store_true", help="Download/load model only, without a voice sample")
parser.add_argument("--engine-check", action="store_true", help="Create a labelled engine test using the model's stock voice")
parser.add_argument("--generate", action="store_true", help="Generate all narration; default is a short preview")
parser.add_argument("--keys", nargs="+", help="Generate only these narration keys, preserving other selected takes")
parser.add_argument("--sample", type=Path, help="An explicit recording of Mohamed, instead of the saved studio sample")
parser.add_argument("--start", type=float, help="Start of a clean 15-second reference section; defaults to the selected take's reference")
parser.add_argument("--cpu", action="store_true", help="Use CPU instead of the NVIDIA GPU")
args = parser.parse_args()
if args.keys and not args.generate:
    parser.error("--keys requires --generate")

sample = args.sample
if not (args.prepare or args.engine_check):
    if sample is None:
        manifest = ROOT / "output/human-audio/selected-takes.json"
        selected = json.loads(manifest.read_text()) if manifest.exists() else {}
        take = selected.get("clone-01", {})
        filename = take.get("filename")
        if not filename or Path(filename).name != filename or not filename.startswith("clone-01-"):
            raise SystemExit("Record and save your sample first at http://127.0.0.1:5185/?mode=clone")
        sample = manifest.parent / filename
        if args.start is None:
            args.start = float(take.get("referenceStart", 0))
    sample = sample.resolve(strict=True)
    if args.start is None:
        args.start = 0
    if args.start < 0:
        raise SystemExit("Reference start must be zero or greater.")
    reference = WORK / f"reference-{time.time_ns()}.wav"
    subprocess.run([
        "ffmpeg", "-y", "-loglevel", "error", "-ss", str(args.start), "-i", str(sample),
        "-t", "15", "-vn", "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(reference),
    ], check=True)
    with wave.open(str(reference)) as audio:
        if audio.getnframes() / audio.getframerate() <= 5:
            raise SystemExit("Choose a clean reference section longer than 5 seconds.")

print("Loading local speech libraries...", flush=True)
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402
from chatterbox.tts_turbo import ChatterboxTurboTTS  # noqa: E402
from voice_model import ensure_model, REVISION  # noqa: E402

revision = REVISION
print(f"Checking verified model files for revision {revision}...", flush=True)
checkpoint = ensure_model(WORK)
device = "cuda" if torch.cuda.is_available() and not args.cpu else "cpu"
torch.set_num_threads(min(6, os.cpu_count() or 4))
torch.manual_seed(42)
print(f"Loading free local Chatterbox Nano on {device}...", flush=True)
model = ChatterboxTurboTTS.from_local(checkpoint, device, nano=True)
print("Model loaded. No voice recordings were uploaded.", flush=True)
if args.prepare:
    raise SystemExit(0)
if args.engine_check:
    started = time.monotonic()
    stock_reference = WORK / "ENGINE-REFERENCE-STOCK.wav"
    target = WORK / "ENGINE-TEST-NOT-MOHAMED.wav"
    stock_text = "This is a stock voice test of the local speech engine. It is not Mohamed's voice. The reference is generated only to check that the free model can produce speech from a local audio file."
    with torch.inference_mode():
        audio = model.generate(stock_text)
    sf.write(stock_reference, audio.detach().cpu().numpy().reshape(-1), model.sr)
    print("Checking reference-audio conditioning with the stock voice only...", flush=True)
    test_text = "This is a local engine test using its stock voice as the reference. It is not Mohamed's voice."
    with torch.inference_mode():
        audio = model.generate(test_text, audio_prompt_path=str(stock_reference))
    sf.write(target, audio.detach().cpu().numpy().reshape(-1), model.sr)
    values = audio.detach().cpu().numpy().reshape(-1)
    if not np.isfinite(values).all() or float(np.sqrt(np.mean(values ** 2))) < 0.001:
        raise SystemExit("Engine check produced invalid or nearly silent audio.")
    target.with_suffix(".json").write_text(json.dumps({
        "purpose": "Local speech and reference-conditioning test; not Mohamed's voice",
        "model": MODEL, "revision": revision, "device": device,
        "text": test_text, "reference": str(stock_reference),
        "duration": len(values) / model.sr, "sampleRate": model.sr,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "published": False,
    }, indent=2))
    print(f"Engine check only: {target}", flush=True)
    raise SystemExit(0)

reference_audio, _ = sf.read(reference)
rms = float(np.sqrt(np.mean(reference_audio ** 2)))
if rms < 0.001:
    raise SystemExit("Reference is almost silent. Record again closer to the microphone.")

def chunks(text, limit=220):
    """Short chunks reduce skipped words and repetition during narration."""
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        if current and len(current) + len(sentence) > limit:
            yield current
            current = ""
        if len(sentence) > limit:
            for phrase in re.split(r"(?<=,)\s+", sentence):
                if current and len(current) + len(phrase) > limit:
                    yield current
                    current = ""
                current = (current + " " + phrase).strip()
        else:
            current = (current + " " + sentence).strip()
    if current:
        yield current

def synthesize(text, destination):
    pieces = []
    for sentence in re.split(r"(?<=[.!?])\s+", text):
        for chunk in chunks(sentence):
            spoken = chunk.replace("PlainSign", "Plain Sign").replace("CatDrop", "Cat Drop").replace("Permit2", "Permit Two")
            with torch.inference_mode():
                audio = model.generate(spoken, audio_prompt_path=str(reference))
            pieces.extend([audio.detach().cpu().numpy().reshape(-1), np.zeros(round(model.sr * 0.38), dtype=np.float32)])
    result = np.concatenate(pieces)
    sf.write(destination, result, model.sr)
    return len(result) / model.sr

provenance = {
    "voiceType": "AI-generated clone of Mohamed Adib's recorded voice",
    "model": MODEL, "revision": revision, "device": device,
    "sample": str(sample), "reference": str(reference), "referenceStart": args.start,
    "published": False,
}
if not args.generate:
    text = "A website says, Free Mint. But the request underneath can give someone permission to move every NFT in a collection. This is PlainSign: a way to understand that permission before approving it."
    destination = WORK / f"clone-preview-{time.time_ns()}.wav"
    duration = synthesize(text, destination)
    destination.with_suffix(".json").write_text(json.dumps({**provenance, "text": text, "duration": duration}, indent=2))
    print(f"Voice clone preview: {destination}\nListen for resemblance, pronunciation and natural pacing before generating the full narration.", flush=True)
else:
    narration = json.loads((ROOT / "docs/human-narration.json").read_text())
    output = ROOT / "output/cloned-audio"
    output.mkdir(parents=True, exist_ok=True)
    manifest = output / "selected-takes.json"
    selected = json.loads(manifest.read_text()) if manifest.exists() else {}
    available = {f"{kind}-{index:02}" for kind, rows in narration.items() for index, _ in enumerate(rows, 1)}
    if args.keys and not set(args.keys).issubset(available):
        raise SystemExit("Unknown narration key in --keys")
    for kind, rows in narration.items():
        for index, row in enumerate(rows, 1):
            key = f"{kind}-{index:02}"
            if args.keys and key not in args.keys:
                continue
            filename = f"{key}-cloned-{time.time_ns()}.wav"
            duration = synthesize(row["text"], output / filename)
            selected[key] = {"filename": filename, "duration": duration, **provenance}
            manifest.write_text(json.dumps(selected, indent=2))
            print(f"Generated {key}: {duration:.1f}s", flush=True)
    print("Cloned narration generated for local review. Use compose.mjs --cloned; public media is unchanged.", flush=True)
