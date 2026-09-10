import { spawnSync } from "node:child_process";

const [workspace, script] = process.argv.slice(2);
const npmCli = process.env.npm_execpath;

if (!workspace || !script) {
  throw new Error("Usage: run-workspace-script.js <workspace> <script>");
}
if (!npmCli) {
  throw new Error("npm_execpath is unavailable. Run this command through npm.");
}

const result = spawnSync(
  process.execPath,
  [npmCli, "--prefix", workspace, "run", script],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
