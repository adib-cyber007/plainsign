"""Fetch the pinned, public Nano checkpoint and verify its upstream hashes."""
import hashlib
import json
import os
import shutil
import time

import requests

MODEL = "ResembleAI/chatterbox-nano"
REVISION = "71ccd1d0081b430592cea481f4307e764e07bc64"
# Official metadata: /api/models/ResembleAI/chatterbox-nano/revision/<revision>?blobs=true
# Small files use Git blob SHA-1; LFS files use SHA-256. Only model data is fetched.
FILES = {
    "added_tokens.json": (418, "git", "fd85325cdfafc690469b6f0e8aeb5cf4649c1450"),
    "conds.pt": (169454, "sha256", "b1852099306fd6a7814eb9d0bd10186caba7249596cc23868f78a0eefbfa5033"),
    "merges.txt": (456318, "git", "226b0752cac7789c48f0cb3ec53eda48b7be36cc"),
    "s3gen_meanflow.safetensors": (1064875036, "sha256", "d65cb687a2ed581ee6cc297e919ffefa63386944f42364ae13b78a594945514f"),
    "special_tokens_map.json": (470, "git", "b2d2dbc845800c78fe98656af927d831ab4ff7b7"),
    "t3_nano_v1.safetensors": (869899204, "sha256", "72b110185087d945dbdf54dee4e333848e1811bdd5fd6cb16ceb8da50006f0c9"),
    "tokenizer_config.json": (3878, "git", "58bc759ea7dab3dd5442f0500e493f170eeba67f"),
    "ve.safetensors": (5695784, "sha256", "f0921cab452fa278bc25cd23ffd59d36f816d7dc5181dd1bef9751a7fb61f63c"),
    "vocab.json": (999186, "git", "a15dd0028acd1dd2c1c2394c80e1de8f3f12a0e4"),
}


def valid(path, specification):
    size, algorithm, expected = specification
    if not path.is_file() or path.stat().st_size != size:
        return False
    digest = hashlib.sha256() if algorithm == "sha256" else hashlib.sha1()
    if algorithm == "git":
        digest.update(f"blob {size}\0".encode())
    with path.open("rb") as source:
        for block in iter(lambda: source.read(4 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest() == expected


def download(session, destination, specification):
    size = specification[0]
    partial = destination.with_suffix(destination.suffix + ".part")
    url = f"https://huggingface.co/{MODEL}/resolve/{REVISION}/{destination.name}?download=true"
    for attempt in range(3):
        offset = partial.stat().st_size if partial.exists() else 0
        if offset == size and valid(partial, specification):
            os.replace(partial, destination)
            return
        if offset >= size:
            offset = 0
        headers = {"Accept-Encoding": "identity"}
        if offset:
            headers["Range"] = f"bytes={offset}-"
        try:
            with session.get(url, headers=headers, stream=True, timeout=(10, 30)) as response:
                response.raise_for_status()
                if response.status_code == 206:
                    expected_range = f"bytes {offset}-"
                    if not response.headers.get("Content-Range", "").startswith(expected_range):
                        raise RuntimeError("Unexpected model download range")
                else:
                    offset = 0
                completed = offset
                last_report = time.monotonic()
                print(f"Downloading {destination.name}: {completed / size:.0%}", flush=True)
                with partial.open("ab" if offset else "wb") as target:
                    for block in response.iter_content(1024 * 1024):
                        if not block:
                            continue
                        completed += len(block)
                        if completed > size:
                            raise RuntimeError("Model download exceeds its declared size")
                        target.write(block)
                        if time.monotonic() - last_report >= 10:
                            print(f"  {destination.name}: {completed / size:.0%}", flush=True)
                            last_report = time.monotonic()
            if not valid(partial, specification):
                raise RuntimeError(f"Hash verification failed for {destination.name}")
            os.replace(partial, destination)
            print(f"Verified {destination.name}", flush=True)
            return
        except (requests.RequestException, OSError, RuntimeError) as error:
            if attempt == 2:
                raise RuntimeError(f"Could not fetch {destination.name}: {error}") from error
            print(f"Retrying {destination.name}: {error}", flush=True)
            time.sleep(1)


def ensure_model(work):
    checkpoint = work / "model-nano" / REVISION
    checkpoint.mkdir(parents=True, exist_ok=True)
    cached = work / "hf-cache/hub/models--ResembleAI--chatterbox-nano/snapshots" / REVISION
    with requests.Session() as session:
        for filename, specification in FILES.items():
            destination = checkpoint / filename
            if valid(destination, specification):
                continue
            candidates = [cached / filename]
            if filename == "ve.safetensors":
                candidates.append(work / "probe-ve.safetensors")
            for candidate in candidates:
                if valid(candidate, specification):
                    shutil.copyfile(candidate, destination)
                    print(f"Reused verified {filename}", flush=True)
                    break
            else:
                download(session, destination, specification)
    (work / "model-revision.json").write_text(json.dumps({
        "repo": MODEL, "revision": REVISION, "license": "MIT",
        "verifiedFiles": {name: {"bytes": row[0], "hashType": row[1], "hash": row[2]} for name, row in FILES.items()},
    }, indent=2))
    return checkpoint
