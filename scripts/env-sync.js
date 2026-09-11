import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targets = [["contracts", new Set(["DEPLOYER_PRIVATE_KEY", "ATTACKER_ADDRESS", "VICTIM_ADDRESS", "VITE_SEPOLIA_RPC"])], ["demo-dapp", new Set(["VITE_SEPOLIA_RPC", "ATTACKER_ADDRESS", "VICTIM_ADDRESS", "VITE_DEMO_CHAIN"])]];
const source = await readFile(path.join(root, ".env"), "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error));
const entries = source.split(/\r?\n/).filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line));
for (const [directory, keys] of targets) {
  await mkdir(path.join(root, directory), { recursive: true });
  const lines = entries.filter((line) => keys.has(line.slice(0, line.indexOf("="))));
  await writeFile(path.join(root, directory, ".env"), lines.length ? `${lines.join("\n")}\n` : "");
  console.info(`Synced ${lines.length} key(s) to ${directory}/.env`);
}
