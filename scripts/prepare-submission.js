import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import packageJson from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script using npm run submission:package.");
const target = path.join(root, "output", "submission");
await mkdir(target, { recursive: true });
await mkdir(path.join(target, "docs"), { recursive: true });
// Prevent developer keys, private RPC tokens and test flags entering public assets.
const env = {
  ...process.env,
  VITE_LLM_KEY: "", VITE_ALCHEMY_KEY: "", VITE_E2E: "0",
  VITE_E2E_MOCK_ENRICH: "0", VITE_E2E_MOCK_LLM: "0", VITE_PLAINSIGN_DEBUG: "0",
  VITE_MAINNET_RPC: "https://ethereum-rpc.publicnode.com",
  VITE_SEPOLIA_RPC: "https://ethereum-sepolia-rpc.publicnode.com",
  VITE_DEMO_CHAIN: "11155111",
};
for (const args of [["run", "build"], ["run", "package"], ["--prefix", "demo-dapp", "run", "build"]]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed: npm ${args.join(" ")}`);
}
const zipName = `plainsign-${packageJson.version}.zip`;
await cp(path.join(root, "dist", zipName), path.join(target, zipName));
await cp(path.join(root, "docs", "denylist.json"), path.join(root, "demo-dapp", "dist", "denylist.json"));
await cp(path.join(root, "docs", "slides.pdf"), path.join(target, "plainsign-pitch.pdf"));
for (const file of ["SUBMISSION_READINESS.md", "submission.md", "demo-script.md", "pitch-script.md", "PRE_EXISTING_WORK.md", "VERIFICATION.md", "architecture.md", "slides.pdf", "slides.md", "denylist.json"]) {
  await cp(path.join(root, "docs", file), path.join(target, "docs", file));
}
await cp(path.join(root, "docs", "screenshots"), path.join(target, "docs", "screenshots"), { recursive: true });
await cp(path.join(root, "docs", "assets"), path.join(target, "docs", "assets"), { recursive: true });
await cp(path.join(root, "README.md"), path.join(target, "README.md"));
await cp(path.join(root, "public", "icon", "128.png"), path.join(target, "plainsign-logo.png"));
await cp(path.join(root, "LICENSE"), path.join(target, "LICENSE"));

const siteZip = path.join(target, "plainsign-site.zip");
const output = createWriteStream(siteZip);
const archive = archiver("zip", { zlib: { level: 9 } });
const finished = new Promise((resolve, reject) => { output.on("close", resolve); output.on("error", reject); archive.on("error", reject); });
archive.pipe(output);
archive.directory(path.join(root, "demo-dapp", "dist"), false);
await archive.finalize();
await finished;

const hashes = [];
for (const file of [zipName, "plainsign-pitch.pdf", "plainsign-site.zip"]) {
  const bytes = await readFile(path.join(target, file));
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${file}`);
}
await writeFile(path.join(target, "SHA256SUMS.txt"), `${hashes.join("\n")}\n`);
await writeFile(path.join(target, "START_HERE.md"), `# PlainSign submission package\n\n1. Read [the checklist](docs/SUBMISSION_READINESS.md).\n2. Extract ${zipName} and load its folder in Chrome using Load unpacked.\n3. Review [the pitch deck](plainsign-pitch.pdf) and [form copy](docs/submission.md).\n4. Use plainsign-site.zip for the updated GitHub Pages site under /plainsign/.\n5. Supply team facts, record and publish both videos, verify public links, and submit before the deadline.\n\nThe extension build contains no optional API keys or E2E mock flags. The site sample walkthrough deliberately uses labelled simulated metadata. SHA256SUMS.txt records the artifact hashes.\n`);
console.info(`Submission files prepared in ${target}. Team, public video links, publication and portal submission remain owner tasks.`);
