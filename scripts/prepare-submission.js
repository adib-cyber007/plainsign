import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli)
  throw new Error("Run this script using npm run submission:package.");
// Versioned packages preserve earlier publication reports and portal receipts.
const target = path.join(root, "output", `submission-${packageJson.version}`);
await mkdir(target, { recursive: true });
await mkdir(path.join(target, "docs"), { recursive: true });
// Prevent developer keys, private RPC tokens and test flags entering public assets.
const env = {
  ...process.env,
  // dotenv-expand restores .env values over empty strings. Non-empty whitespace
  // survives expansion and the runtime trims it to disabled/empty.
  VITE_LLM_KEY: " ",
  VITE_ALCHEMY_KEY: " ",
  VITE_E2E: "0",
  VITE_E2E_MOCK_ENRICH: "0",
  VITE_E2E_MOCK_LLM: "0",
  VITE_PLAINSIGN_DEBUG: "0",
  VITE_MAINNET_RPC: "https://ethereum-rpc.publicnode.com",
  VITE_SEPOLIA_RPC: "https://ethereum-sepolia-rpc.publicnode.com",
  VITE_DEMO_CHAIN: "11155111",
};
const sensitiveValues = [];
for (const directory of [
  root,
  path.join(root, "demo-dapp"),
  path.join(root, "contracts"),
]) {
  for (const file of await readdir(directory)) {
    if (!/^\.env(?:\.|$)/.test(file) || file === ".env.example") continue;
    for (const line of (
      await readFile(path.join(directory, file), "utf8")
    ).split(/\r?\n/)) {
      const match = line.match(
        /^([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*)\s*=\s*(.*)$/,
      );
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value.length > 8) sensitiveValues.push({ field: match[1], value });
    }
  }
}
const notices = spawnSync(
  process.execPath,
  [path.join(root, "scripts", "collect-license-notices.js")],
  { cwd: root, stdio: "inherit" },
);
if (notices.error) throw notices.error;
if (notices.status !== 0)
  throw new Error("Dependency notice collection failed.");
for (const args of [
  ["run", "build"],
  ["--prefix", "demo-dapp", "run", "build"],
]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Build failed: npm ${args.join(" ")}`);
}
await auditDirectory(path.join(root, ".output", "chrome-mv3"));
await auditDirectory(path.join(root, "demo-dapp", "dist"));
const packaged = spawnSync(process.execPath, [npmCli, "run", "package"], {
  cwd: root,
  env,
  stdio: "inherit",
});
if (packaged.error) throw packaged.error;
if (packaged.status !== 0) throw new Error("Extension packaging failed.");
const zipName = `plainsign-${packageJson.version}.zip`;
const releasedZipIndex = process.argv.indexOf("--released-zip");
const releasedZip =
  releasedZipIndex < 0 ? undefined : process.argv[releasedZipIndex + 1];
if (releasedZipIndex >= 0 && !releasedZip)
  throw new Error("--released-zip requires a path.");
if (releasedZip) {
  const bytes = await readFile(path.resolve(root, releasedZip));
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (
    packageJson.version !== "0.2.0" ||
    sha !== "ee99a0fc5c663b6d1169419e58def298aa9425121768992a3fb538c9d509ffb5"
  )
    throw new Error(
      "Released ZIP does not match the verified public 0.2.0 asset.",
    );
}
await cp(
  releasedZip
    ? path.resolve(root, releasedZip)
    : path.join(root, "dist", zipName),
  path.join(target, zipName),
);
await cp(
  path.join(root, "docs", "denylist.json"),
  path.join(root, "demo-dapp", "dist", "denylist.json"),
);
await cp(
  path.join(root, "docs", "slides.pdf"),
  path.join(target, "plainsign-pitch.pdf"),
);
await cp(
  path.join(root, "docs", "plainsign-pitch.pptx"),
  path.join(target, "plainsign-pitch.pptx"),
);
for (const file of [
  "SUBMISSION_READINESS.md",
  "SUBMISSION_STATUS.md",
  "JUDGE_GUIDE.md",
  "submission.md",
  "demo-script.md",
  "pitch-script.md",
  "PRE_EXISTING_WORK.md",
  "HACKATHON_RULES_REVIEW.md",
  "THIRD_PARTY.md",
  "VIDEO_PUBLISHING.md",
  "human-narration.json",
  "HUMAN_NARRATION.md",
  "VOICE_CLONE.md",
  "VERIFICATION.md",
  "architecture.md",
  "slides.pdf",
  "plainsign-pitch.pptx",
  "slides.md",
  "denylist.json",
]) {
  await cp(path.join(root, "docs", file), path.join(target, "docs", file));
}
await cp(
  path.join(root, "docs", "screenshots"),
  path.join(target, "docs", "screenshots"),
  { recursive: true },
);
await cp(
  path.join(root, "docs", "assets"),
  path.join(target, "docs", "assets"),
  { recursive: true },
);
await cp(path.join(root, "README.md"), path.join(target, "README.md"));
await cp(
  path.join(root, "public", "icon", "128.png"),
  path.join(target, "plainsign-logo.png"),
);
await cp(path.join(root, "LICENSE"), path.join(target, "LICENSE"));

const siteZip = path.join(target, "plainsign-site.zip");
const output = createWriteStream(siteZip);
const archive = archiver("zip", { zlib: { level: 9 } });
const finished = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
});
archive.pipe(output);
archive.directory(path.join(root, "demo-dapp", "dist"), false);
await archive.finalize();
await finished;

const hashes = [];
for (const file of [
  zipName,
  "plainsign-pitch.pdf",
  "plainsign-pitch.pptx",
  "plainsign-site.zip",
]) {
  const bytes = await readFile(path.join(target, file));
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
}
await writeFile(path.join(target, "SHA256SUMS.txt"), `${hashes.join("\n")}\n`);
await writeFile(path.join(target, "BUILD_INFO.json"), `${JSON.stringify({
  version: packageJson.version,
  builtAt: new Date().toISOString(),
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  localChanges: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim()),
  publication: "Local candidate; see docs/SUBMISSION_STATUS.md for the submitted/public versions.",
}, null, 2)}\n`);
await writeFile(
  path.join(target, "START_HERE.md"),
  `# PlainSign ${packageJson.version} review package\n\nPlainSign is already entered for judging as Colosseum project 17231. The saved receipt records October 12, 2026 at 6:52 PM IST. This folder is a local product update; it does not establish publication of this version.\n\n1. Read [the current status](docs/SUBMISSION_STATUS.md) and [judge walkthrough](docs/JUDGE_GUIDE.md).\n2. Extract ${zipName} and load its folder in Chrome using Load unpacked.\n3. Review [the eight-slide pitch](plainsign-pitch.pdf), [editable PowerPoint](plainsign-pitch.pptx), and [form copy](docs/submission.md).\n4. plainsign-site.zip contains the site, six-request sample walkthrough, deck downloads and supplementary captioned MP4s for deployment under /plainsign/.\n5. Submitted videos: https://youtu.be/FY_4VIk0aSY (1:45 pitch) and https://youtu.be/4_deIAYTzSo (1:59 demo). Main form fields are locked; keep the accepted submission intact.\n\nThe extension build disables optional API keys and E2E flags. The sample walkthrough and recorded demo use labelled simulated metadata. Both videos use a local AI clone of Mohamed's voice with his permission; original recordings and model files are excluded. SHA256SUMS.txt records the artifact hashes. Run npm run submission:audit to validate this bundle.\n`,
);
console.info(
  `Review package prepared in ${target}. Run npm run submission:audit. Publication of this candidate is separate from the accepted portal submission.`,
);

async function auditDirectory(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, file.name);
    if (file.isDirectory()) {
      await auditDirectory(filename);
      continue;
    }
    if (!/\.(js|html|json)$/.test(file.name)) continue;
    const content = await readFile(filename, "utf8");
    for (const { field, value } of sensitiveValues) {
      if (content.includes(value))
        throw new Error(
          `Public build contains a developer value from ${field}; packaging stopped.`,
        );
    }
    if (content.includes("plainsign-e2e"))
      throw new Error("Public build contains an E2E key; packaging stopped.");
  }
}
