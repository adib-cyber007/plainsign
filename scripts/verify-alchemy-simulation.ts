import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAddress, type Address } from "viem";

import { analyze } from "../src/analyze";
import { serialize } from "../src/bridge/protocol";
import { simulateWithAlchemy } from "../src/simulate/alchemy";
import type { AnalysisRequest } from "../src/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const values = parseEnv(await readFile(path.join(root, ".env"), "utf8"));
const apiKey = values.get("VITE_ALCHEMY_KEY")?.trim();
const victimValue = values.get("VICTIM_ADDRESS")?.trim();

if (!apiKey) {
  throw new Error("VITE_ALCHEMY_KEY is required in the root .env.");
}
if (!victimValue || !/^0x[0-9a-fA-F]{40}$/.test(victimValue)) {
  throw new Error("VICTIM_ADDRESS is missing or invalid in the root .env.");
}

const victim = getAddress(victimValue) as Address;
const weth = getAddress("0xfff9976782d46cc05630d1f6ebab18b2324d6b14");
const request: AnalysisRequest = {
  id: "live-sepolia-weth-deposit",
  origin: "http://localhost:5173",
  chainId: 11_155_111,
  from: victim,
  request: {
    method: "eth_sendTransaction",
    params: [
      {
        from: victim,
        to: weth,
        data: "0xd0e30db0",
        value: "0x2386f26fc10000",
      },
    ],
  },
};

const result = await analyze(request, {
  simulate: (current) => simulateWithAlchemy(current, apiKey),
  debug: () => undefined,
  debugTable: () => undefined,
});
const output = {
  ok: result.simulation.ok,
  provider: result.simulation.provider,
  error: result.simulation.error,
  reverted: result.simulation.reverted,
  changes: result.simulation.changes,
  durationMs: result.durationMs,
};
console.log(JSON.stringify(serialize(output), null, 2));

const formatted = result.simulation.changes.map((change) => change.formatted);
if (
  !result.simulation.ok ||
  !formatted.includes("-0.01 ETH") ||
  !formatted.includes("+0.01 WETH")
) {
  throw new Error(
    "Live WETH simulation did not return the expected -0.01 ETH / +0.01 WETH changes.",
  );
}

function parseEnv(source: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}
