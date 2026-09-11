import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs", "assets");
const output = path.join(outputDir, "repo-qr.png");
const repoUrl = "https://github.com/adib-cyber007/plainsign";

await mkdir(outputDir, { recursive: true });
await QRCode.toFile(output, repoUrl, {
  width: 720,
  margin: 2,
  color: { dark: "#0b1220", light: "#ffffff" },
  errorCorrectionLevel: "H",
});
console.info(`Created ${output}`);
