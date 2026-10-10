import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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
  // dotenv-expand restores .env values over empty strings. Non-empty whitespace
  // survives expansion and the runtime trims it to disabled/empty.
  VITE_LLM_KEY: " ", VITE_ALCHEMY_KEY: " ", VITE_E2E: "0",
  VITE_E2E_MOCK_ENRICH: "0", VITE_E2E_MOCK_LLM: "0", VITE_PLAINSIGN_DEBUG: "0",
  VITE_MAINNET_RPC: "https://ethereum-rpc.publicnode.com",
  VITE_SEPOLIA_RPC: "https://ethereum-sepolia-rpc.publicnode.com",
  VITE_DEMO_CHAIN: "11155111",
};
const sensitiveValues = [];
for (const directory of [root, path.join(root, "demo-dapp"), path.join(root, "contracts")]) {
  for (const file of await readdir(directory)) {
    if (!/^\.env(?:\.|$)/.test(file) || file === ".env.example") continue;
    for (const line of (await readFile(path.join(directory, file), "utf8")).split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value.length > 8) sensitiveValues.push({ field: match[1], value });
    }
  }
}
for (const args of [["run", "build"], ["--prefix", "demo-dapp", "run", "build"]]) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed: npm ${args.join(" ")}`);
}
await auditDirectory(path.join(root, ".output", "chrome-mv3"));
await auditDirectory(path.join(root, "demo-dapp", "dist"));
const packaged = spawnSync(process.execPath, [npmCli, "run", "package"], { cwd: root, env, stdio: "inherit" });
if (packaged.error) throw packaged.error;
if (packaged.status !== 0) throw new Error("Extension packaging failed.");
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

async function auditDirectory(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, file.name);
    if (file.isDirectory()) { await auditDirectory(filename); continue; }
    if (!/\.(js|html|json)$/.test(file.name)) continue;
    const content = await readFile(filename, "utf8");
    for (const { field, value } of sensitiveValues) {
      if (content.includes(value)) throw new Error(`Public build contains a developer value from ${field}; packaging stopped.`);
    }
    if (content.includes("plainsign-e2e")) throw new Error("Public build contains an E2E key; packaging stopped.");
  }
}
