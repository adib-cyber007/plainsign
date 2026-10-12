"""Local speech checks and script-aligned caption cues for cloned narration."""
import argparse
from difflib import SequenceMatcher
import hashlib
import json
import os
from pathlib import Path
import re
import textwrap

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / "output/voice-clone"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--prepare", action="store_true", help="Download the public Whisper base.en checkpoint only")
args = parser.parse_args()

import torch  # noqa: E402
import whisper  # noqa: E402

cache = WORK / "whisper-cache"
if args.prepare:
    whisper.load_model("base.en", device="cpu", download_root=str(cache))
    raise SystemExit(0)
checkpoint = cache / "base.en.pt"
if not checkpoint.exists():
    raise SystemExit("Prepare the local transcription model first: captions.py --prepare")
torch.set_num_threads(min(6, os.cpu_count() or 4))
model = whisper.load_model(str(checkpoint), device="cuda" if torch.cuda.is_available() else "cpu")
audio_dir = ROOT / "output/cloned-audio"
selected = json.loads((audio_dir / "selected-takes.json").read_text())
narration = json.loads((ROOT / "docs/human-narration.json").read_text())
destination = audio_dir / "captions"
destination.mkdir(exist_ok=True)


def token(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


def cues_for(text, spoken, duration):
    words = text.split()
    matcher = SequenceMatcher(None, [token(w) for w in words], [token(w["word"]) for w in spoken], autojunk=False)
    timings = [None] * len(words)
    for block in matcher.get_matching_blocks():
        for offset in range(block.size):
            row = spoken[block.b + offset]
            timings[block.a + offset] = [row["start"], row["end"]]
    # Keep verified script spelling for names; interpolate gaps between recognized anchors.
    i = 0
    while i < len(words):
        if timings[i] is not None:
            i += 1
            continue
        end = i + 1
        while end < len(words) and timings[end] is None:
            end += 1
        start_time = timings[i - 1][1] if i else 0
        end_time = timings[end][0] if end < len(words) else duration
        step = max(0, end_time - start_time) / (end - i)
        for j in range(i, end):
            timings[j] = [start_time + step * (j - i), start_time + step * (j - i + 1)]
        i = end
    cues = []
    first = 0
    while first < len(words):
        end = first + 1
        while end < len(words) and len(" ".join(words[first:end + 1])) <= 76 and timings[end][1] - timings[first][0] <= 4.5:
            end += 1
        start_time = max(0, timings[first][0])
        end_time = min(duration, max(start_time + 0.2, timings[end - 1][1] + 0.08))
        if end < len(words):
            end_time = min(end_time, max(start_time + 0.2, timings[end][0]))
        cues.append({"start": round(start_time, 3), "end": round(end_time, 3), "text": "\n".join(textwrap.wrap(" ".join(words[first:end]), width=44))})
        first = end
    return cues, matcher.ratio()


summary = []
for kind, rows in narration.items():
    for index, row in enumerate(rows, 1):
        key = f"{kind}-{index:02}"
        take = selected[key]
        filename = take["filename"]
        if Path(filename).name != filename or not filename.startswith(key + "-"):
            raise SystemExit("Invalid selected take filename")
        source = audio_dir / filename
        result = model.transcribe(str(source), language="en", temperature=0, beam_size=5, word_timestamps=True, condition_on_previous_text=False, verbose=None)
        spoken = [word for segment in result["segments"] for word in segment.get("words", [])]
        if not spoken:
            raise SystemExit(f"No speech was recognized in {key}")
        cues, ratio = cues_for(row["text"], spoken, take["duration"])
        report = {"sourceFilename": filename, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "expectedText": row["text"], "recognizedText": result["text"], "wordMatchRatio": round(ratio, 3), "cues": cues, "recognition": result, "note": "Local automated check and script alignment; perceptual review is separate."}
        (destination / f"{key}.json").write_text(json.dumps(report, indent=2))
        summary.append({"key": key, "wordMatchRatio": round(ratio, 3), "recognizedText": result["text"]})
        print(f"Checked {key}: word match {ratio:.2f}", flush=True)
(destination / "summary.json").write_text(json.dumps(summary, indent=2))
print(f"Speech checks and caption cues: {destination}", flush=True)
