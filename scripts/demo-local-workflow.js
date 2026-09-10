import { spawn, spawnSync } from "node:child_process";

const rpcUrl = "http://127.0.0.1:8545";
const dappUrl = "http://localhost:5173";
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("npm_execpath is unavailable. Start this workflow with npm.");

await waitForRpc();
console.info("✅ Chain ready");
runNpm(["run", "deploy:local"]);
console.info("✅ Contracts deployed");
runNpm(["run", "seed:local"]);
runNpm(["run", "dapp:addresses"]);

const dapp = spawn(
  process.execPath,
  [npmCli, "--prefix", "demo-dapp", "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"],
  { stdio: "inherit" },
);

const stop = () => {
  if (!dapp.killed) dapp.kill();
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

await waitForDapp();
console.info(`✅ Demo dApp: ${dappUrl}`);

const exitCode = await new Promise((resolve, reject) => {
  dapp.once("error", reject);
  dapp.once("exit", (code) => resolve(code ?? 0));
});
process.exitCode = exitCode;

async function waitForRpc() {
  await poll(async () => {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    return payload.result === "0x7a69";
  }, "Hardhat RPC");
}

async function waitForDapp() {
  await poll(async () => (await fetch(dappUrl)).ok, "demo dApp");
}

async function poll(check, label) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch {
      // The service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready within 60 seconds.`);
}

function runNpm(args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(" ")} failed with exit code ${result.status}.`);
  }
}
