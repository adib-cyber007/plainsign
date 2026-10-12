import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yauzl from "yauzl";
import packageJson from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "output", `submission-${packageJson.version}`);
const extensionName = `plainsign-${packageJson.version}.zip`;
const sums = (await readFile(path.join(target, "SHA256SUMS.txt"), "utf8")).trim().split(/\r?\n/);
assert.equal(sums.length, 4, "Expected checksums for four submission artifacts.");
const verifiedHashes = {};
for (const line of sums) {
  const match = /^([a-f0-9]{64}) {2}([\w.-]+)$/.exec(line);
  assert.ok(match, "Invalid checksum entry.");
  const [, expected, name] = match;
  const bytes = await readFile(path.join(target, name));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), expected, `Checksum mismatch: ${name}`);
  verifiedHashes[name] = expected;
}
for (const name of [extensionName, "plainsign-site.zip", "plainsign-pitch.pdf", "plainsign-pitch.pptx"]) {
  assert.ok(verifiedHashes[name], `Missing checksum: ${name}`);
}

const extension = await readZip(path.join(target, extensionName));
const site = await readZip(path.join(target, "plainsign-site.zip"));
for (const name of ["manifest.json", "inject.js", "background.js", "content-scripts/content.js", "options.html", "THIRD_PARTY_NOTICES.txt", "icon/128.png"]) {
  assert.ok(extension.has(name), `Missing extension file: ${name}`);
}
const manifest = JSON.parse(extension.get("manifest.json").toString());
assert.equal(manifest.version, packageJson.version);
assert.equal(manifest.manifest_version, 3);
for (const name of [
  "index.html", "review.html", "presentation.html", "product-demo.html",
  "plainsign-pitch.pdf", "plainsign-pitch.pptx", "denylist.json", "THIRD_PARTY_NOTICES.txt", "icon/128.png",
  ...["presentation", "product-demo"].flatMap(video => [
    `videos/${video}.mp4`, `videos/${video}.vtt`, `videos/${video}-transcript.txt`, `videos/${video}-poster.png`,
  ]),
]) assert.ok(site.has(name), `Missing site file: ${name}`);
for (const video of ["presentation", "product-demo"]) {
  assert.match(site.get(`videos/${video}.vtt`).toString(), /^WEBVTT/);
  assert.ok(site.get(`videos/${video}.mp4`).length > 1_000_000, "Video asset is unexpectedly small.");
}
for (const [source, bundled] of [["slides.pdf", "plainsign-pitch.pdf"], ["plainsign-pitch.pptx", "plainsign-pitch.pptx"]]) {
  const bytes = await readFile(path.join(root, "docs", source));
  assert.ok(bytes.equals(await readFile(path.join(target, bundled))), `Stale packaged deck: ${bundled}`);
  assert.ok(bytes.equals(site.get(bundled)), `Stale site deck: ${bundled}`);
}

const requiredDocs = ["SUBMISSION_STATUS.md", "SUBMISSION_READINESS.md", "JUDGE_GUIDE.md", "submission.md", "PRE_EXISTING_WORK.md", "THIRD_PARTY.md", "VERIFICATION.md"];
for (const doc of requiredDocs) await readFile(path.join(target, "docs", doc));
const report = {
  checkedAt: new Date().toISOString(), version: packageJson.version, result: "pass",
  extensionFiles: extension.size, siteFiles: site.size, verifiedHashes,
  checks: ["Four SHA-256 checksums", "MV3 manifest and version", "Required runtime notices", "No environment files, sourcemaps, private media, or test-wallet marker", "Both videos, captions and transcripts", "Decks match source bytes", "Submission and development disclosures"],
  limits: "Local package structure/integrity check. Does not establish publication, detection accuracy, or a real-MetaMask rehearsal. Developer-value scanning is performed by submission:package before archiving.",
};
await writeFile(path.join(target, "artifact-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.info(`Passed: PlainSign ${packageJson.version}; ${extension.size} extension files, ${site.size} site files, four matching SHA-256 checksums.`);

async function readZip(filename) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      const files = new Map();
      let totalBytes = 0;
      const fail = error => { zip.close(); reject(error); };
      zip.on("error", fail);
      zip.on("end", () => resolve(files));
      zip.on("entry", entry => {
        try {
          const name = entry.fileName;
          assert.ok(!name.startsWith("/") && !name.split("/").includes(".."), "Unsafe archive path.");
          assert.ok(!/(^|\/)\.env(?:[./]|$)|\.map$|(^|\/)(?:voice-clone|human-audio|cloned-audio|node_modules|\.git)(?:\/|$)/i.test(name), "Private or development file in public archive.");
          assert.ok(!files.has(name), "Duplicate archive entry.");
          if (name.endsWith("/")) { zip.readEntry(); return; }
          totalBytes += entry.uncompressedSize;
          assert.ok(totalBytes < 64 * 1024 * 1024 && files.size < 512, "Unexpected archive size.");
          zip.openReadStream(entry, (error, stream) => {
            if (error) return fail(error);
            const chunks = [];
            stream.on("error", fail);
            stream.on("data", chunk => chunks.push(chunk));
            stream.on("end", () => {
              const bytes = Buffer.concat(chunks);
              if (/\.(?:js|json|html)$/.test(name) && /plainsign-e2e|\[MockWallet\]/.test(bytes.toString())) {
                fail(new Error("Test-wallet marker in public archive."));
                return;
              }
              files.set(name, bytes);
              zip.readEntry();
            });
          });
        } catch (error) { fail(error); }
      });
      zip.readEntry();
    });
  });
}
