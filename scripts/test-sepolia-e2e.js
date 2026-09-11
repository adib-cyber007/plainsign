import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable. Start this command with npm.");

const values = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
const victim = values.get("VICTIM_ADDRESS")?.trim();
if (!victim) throw new Error("VICTIM_ADDRESS is required in the root .env.");
if (!/^0x[0-9a-fA-F]{40}$/.test(victim)) {
  throw new Error("VICTIM_ADDRESS in the root .env is invalid.");
}

const childEnv = {
  ...process.env,
  VITE_E2E: "1",
  VITE_DEMO_CHAIN: "11155111",
  PLAIN_SIGN_E2E_DEMO_CHAIN: "11155111",
  MOCK_WALLET_ACCOUNT: victim,
  ...(values.get("VITE_SEPOLIA_RPC")
    ? { VITE_SEPOLIA_RPC: values.get("VITE_SEPOLIA_RPC") }
    : {}),
};

run(process.execPath, [npmCli, "run", "build"], childEnv);
run(
  process.execPath,
  [path.join(root, "node_modules", "@playwright", "test", "cli.js"), "test", "tests/e2e/demo-flow.spec.ts"],
  childEnv,
);

function parseEnv(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function run(command, args, env) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Child process failed with exit code ${result.status}.`);
  }
}
