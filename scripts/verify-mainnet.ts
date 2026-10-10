import { mkdir, writeFile } from "node:fs/promises";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { CHAINS } from "../src/config/chains";

// Read-only integration evidence. This script never signs or sends a transaction.
const config = CHAINS[1];
const checks: Record<string, unknown>[] = [];
let connected = false;
for (const rpc of config.rpcUrls) {
  try {
    const client = createPublicClient({ chain: mainnet, transport: http(rpc, { timeout: 8000, retryCount: 0 }) });
    const [chainId, blockNumber, code] = await Promise.all([
      client.getChainId(), client.getBlockNumber(), client.getCode({ address: config.wethAddress }),
    ]);
    if (chainId !== 1 || !code || code === "0x") throw new Error("Wrong chain or missing WETH bytecode");
    checks.push({ rpc, ok: true, chainId, blockNumber: blockNumber.toString(), weth: config.wethAddress, wethBytecodeBytes: (code.length - 2) / 2 });
    connected = true;
    break;
  } catch (error) {
    checks.push({ rpc, ok: false, error: error instanceof Error ? error.message.split("\n")[0] : String(error) });
  }
}
try {
  const response = await fetch(`${config.blockscoutBaseUrl}addresses/${config.wethAddress}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json() as { is_contract?: boolean; is_verified?: boolean; name?: string };
  checks.push({ explorer: config.blockscoutBaseUrl, ok: true, isContract: data.is_contract, isVerified: data.is_verified, name: data.name });
} catch (error) {
  checks.push({ explorer: config.blockscoutBaseUrl, ok: false, error: error instanceof Error ? error.message : String(error) });
}
const report = { checkedAt: new Date().toISOString(), readOnly: true, connected, checks };
await mkdir("output/submission", { recursive: true });
await writeFile("output/submission/mainnet-check.json", `${JSON.stringify(report, null, 2)}\n`);
console.info(JSON.stringify(report, null, 2));
if (!connected) process.exitCode = 1;
