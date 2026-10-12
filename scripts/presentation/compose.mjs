// Assemble real recordings or labelled cloned narration into local review videos.
/* global window, document */
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const cloned = args.includes("--cloned");
const kind = args.includes("--demo") ? "demo" : "presentation";
const audioDir = path.join(
  root,
  cloned ? "output/cloned-audio" : "output/human-audio",
);
const build = path.join(
  root,
  `output/${cloned ? "cloned" : "human"}-video-build/${kind}`,
);
const output = path.join(
  root,
  cloned ? "output/cloned-videos" : "output/human-videos",
);
const narration = JSON.parse(
  await readFile(path.join(root, "docs/human-narration.json"), "utf8"),
)[kind];
let selected = {};
try {
  selected = JSON.parse(
    await readFile(path.join(audioDir, "selected-takes.json"), "utf8"),
  );
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const keys = narration.map(
  (_, i) => `${kind}-${String(i + 1).padStart(2, "0")}`,
);
const missing = keys.filter((key) => !selected[key]);
if (missing.length) {
  console.error(
    cloned
      ? `Generate the missing cloned narration first: ${missing.join(", ")}.\nSave one voice sample, then run clone_voice.py --generate.`
      : `Record and save these takes first: ${missing.join(", ")}.\nRun node scripts/presentation/studio.mjs and open http://127.0.0.1:5185.`,
  );
  process.exit(1);
}
if (args.includes("--check")) {
  console.log(
    `${keys.length} selected ${kind} takes found. Composition not started.`,
  );
  process.exit(0);
}
await mkdir(build, { recursive: true });
await mkdir(output, { recursive: true });
function run(command, params, options = {}) {
  const r = spawnSync(command, params, {
    cwd: root,
    encoding: "utf8",
    ...options,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${command}: ${r.stderr?.slice(-3000)}`);
  return r.stdout.trim();
}
const probe = (file) =>
  Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ]),
  );
const segments = [];
for (let i = 0; i < keys.length; i++) {
  const filename = selected[keys[i]].filename;
  if (
    path.basename(filename) !== filename ||
    !filename.startsWith(keys[i] + "-")
  )
    throw new Error("Invalid selected take filename");
  const audio = path.join(build, `${keys[i]}.wav`);
  // Mild cleanup and volume balancing only. Keep timing and vocal pitch.
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    path.join(audioDir, filename),
    "-vn",
    "-af",
    "highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11",
    "-ar",
    "48000",
    "-ac",
    "1",
    audio,
  ]);
  const speechDuration = probe(audio);
  if (
    !Number.isFinite(speechDuration) ||
    speechDuration < 2 ||
    speechDuration > 120
  )
    throw new Error(`Check ${keys[i]}: invalid or unusually short/long audio`);
  segments.push({
    ...narration[i],
    audio,
    speechDuration,
    duration: speechDuration + 0.4,
  });
}
const expected = segments.reduce((sum, row) => sum + row.duration, 0);
if (expected > 177 || (kind === "presentation" && expected < 120))
  throw new Error(
    `The selected ${kind} takes total ${expected.toFixed(1)} seconds. ${kind === "presentation" ? "Aim for 125–175" : "Stay below 175"} seconds so the final video fits the rules. Re-record the necessary takes.`,
  );
const final = path.join(
  output,
  `${kind === "demo" ? "product-demo" : "presentation"}-${cloned ? "cloned" : "human"}-${Date.now()}.mp4`,
);
async function writeDisclosure(text, alignment = 7) {
  const ass = `[Script Info]\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Label,Segoe UI,25,&H00FFFFFF,&H00FFFFFF,&H0009101C,&H9009101C,0,0,0,0,100,100,0,0,3,5,0,${alignment},28,28,18,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.00,0:03:00.00,Label,,0,0,0,,${text}\n`;
  await writeFile(path.join(build, "disclosure.ass"), ass);
  return `ass=output/${cloned ? "cloned" : "human"}-video-build/${kind}/disclosure.ass`;
}
if (kind === "presentation") {
  const disclosure = cloned
    ? await writeDisclosure("Narration: AI clone of Mohamed Adib's voice", 9)
    : null;
  for (let i = 0; i < segments.length; i++) {
    const row = segments[i];
    run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-loop",
      "1",
      "-framerate",
      "24",
      "-i",
      path.join(
        root,
        `output/pitch-v2/slide-${String(i + 1).padStart(2, "0")}.png`,
      ),
      "-i",
      row.audio,
      ...(disclosure ? ["-vf", disclosure] : []),
      "-af",
      "apad=pad_dur=0.4",
      "-t",
      String(row.duration),
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-tune",
      "stillimage",
      "-crf",
      "20",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      path.join(build, `part-${i + 1}.mp4`),
    ]);
  }
  await writeFile(
    path.join(build, "concat.txt"),
    segments.map((_, i) => `file 'part-${i + 1}.mp4'`).join("\n"),
  );
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    path.join(build, "concat.txt"),
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    final,
  ]);
} else {
  // Build the real extension with the isolated test wallet/metadata environment.
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npm, ["run", "build"], {
    shell: process.platform === "win32",
    env: {
      ...process.env,
      VITE_E2E: "1",
      VITE_E2E_MOCK_ENRICH: "1",
      VITE_E2E_MOCK_LLM: "0",
      VITE_LLM_KEY: " ",
      VITE_ALCHEMY_KEY: " ",
    },
  });
  run(npm, ["--prefix", "demo-dapp", "run", "build"], {
    shell: process.platform === "win32",
  });
  const siteRoot = path.join(root, "demo-dapp/dist");
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://127.0.0.1").pathname.replace(
        /^\/plainsign\//,
        "/",
      );
      const file = path.resolve(
        siteRoot,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(siteRoot + path.sep))
        throw new Error("Invalid path");
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(5173, "127.0.0.1", resolve));
  let context, video, rawPath;
  try {
    const profile = await mkdtemp(path.join(build, "browser-")),
      extension = path.join(root, ".output/chrome-mv3");
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      viewport: { width: 1600, height: 900 },
      recordVideo: { dir: build, size: { width: 1600, height: 900 } },
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    });
    await context.addInitScript({
      path: path.join(root, "tests/e2e/mock-wallet.js"),
    });
    const page = await context.newPage();
    video = page.video();
    const started = Date.now();
    await page.goto("http://127.0.0.1:5173/plainsign/?walletChainId=0xaa36a7");
    await page.waitForFunction(() => Boolean(window.__plainsign?.wrapped));
    const reject = () =>
      page.evaluate(() =>
        document
          .getElementById("plainsign-root")
          .shadowRoot.querySelector(".ps-reject")
          .click(),
      );
    const verdict = (expected) =>
      page.waitForFunction(
        (value) =>
          document
            .getElementById("plainsign-root")
            ?.shadowRoot?.querySelector(".ps-verdict h1")?.textContent ===
          value,
        expected,
      );
    for (const row of segments) {
      if (row.scene === "connect")
        await page.locator("#connect-wallet").click();
      if (row.scene === "free-mint") {
        await page.locator("#free-mint").click();
        await verdict("Danger");
      }
      if (row.scene === "reject") {
        await reject();
        await page
          .getByTestId("free-mint-outcome")
          .filter({ hasText: "Rejected (4001)" })
          .waitFor();
        if ((await page.evaluate(() => window.__walletCalls.length)) !== 0)
          throw new Error("Rejected request reached the wallet");
      }
      if (row.scene === "verify") {
        await page.locator("#verify").click();
        await verdict("Danger");
      }
      if (row.scene === "sign-in") {
        await reject();
        await page.locator("#sign-in").click();
        await verdict("Safe");
      }
      if (row.scene === "wrap") {
        await reject();
        await page.locator("#wrap").click();
        await verdict("Safe");
      }
      if (row.scene === "review") {
        await reject();
        await page.goto("http://127.0.0.1:5173/plainsign/review.html");
        await page.locator(".preview-notice").waitFor();
      }
      row.start = (Date.now() - started) / 1000;
      await page.waitForTimeout(row.duration * 1000);
    }
  } finally {
    if (context) await context.close();
    await new Promise((resolve) => server.close(resolve));
  }
  rawPath = await video.path();
  const duration = probe(rawPath);
  if (duration > 180)
    throw new Error(
      `Demo is ${duration}s including actions. Shorten a take before publishing.`,
    );
  const label =
    "Controlled test · automated wallet · simulated metadata · no assets moved" +
    (cloned ? " · AI voice clone" : "");
  const disclosure = await writeDisclosure(label);
  const inputs = segments.flatMap((row) => ["-i", row.audio]);
  const filters =
    segments
      .map(
        (row, i) =>
          `[${i}:a]adelay=${Math.round(row.start * 1000)}:all=1[a${i}]`,
      )
      .join(";") +
    ";" +
    segments.map((_, i) => `[a${i}]`).join("") +
    `amix=inputs=${segments.length}:normalize=0,apad[a]`;
  const audio = path.join(build, "joined.wav");
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    ...inputs,
    "-filter_complex",
    filters,
    "-map",
    "[a]",
    "-t",
    String(duration),
    audio,
  ]);
  run("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    rawPath,
    "-i",
    audio,
    "-vf",
    `scale=1920:1080,${disclosure}`,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-shortest",
    final,
  ]);
}
const duration = probe(final);
if (duration > 180 || (kind === "presentation" && duration < 120))
  throw new Error(`Final duration is outside requirements: ${duration}s`);
await writeFile(
  final + ".json",
  JSON.stringify(
    {
      duration,
      kind,
      voiceType: cloned ? "AI-generated voice clone" : "Human recording",
      selectedTakes: keys.map((key) => selected[key]),
      script: narration,
      subtitles: "Pending review against actual speech",
      published: false,
    },
    null,
    2,
  ),
);
console.log(
  `Review copy: ${final}\nDuration: ${duration.toFixed(1)} seconds. Listen and check facts before publishing. Public videos have not changed.`,
);
