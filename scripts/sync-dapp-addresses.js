import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "contracts", "deployments");
const destination = path.join(root, "demo-dapp", "src", "deployments");

await mkdir(destination, { recursive: true });
const files = (await readdir(source)).filter((file) => file.endsWith(".json"));
if (files.length === 0) {
  throw new Error("No contract deployments found. Run a deploy command first.");
}

for (const file of files) {
  await copyFile(path.join(source, file), path.join(destination, file));
}

console.info(`Synced ${files.length} deployment file(s) to demo-dapp.`);
