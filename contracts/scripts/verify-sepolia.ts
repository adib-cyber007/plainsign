import { readFile } from "node:fs/promises";
import path from "node:path";

import { getAddress, type Address } from "viem";

import {
  isVerifiedOnBlockscout,
  verifyWithBlockscoutV2,
} from "./blockscout-verify";

interface SepoliaDeployment {
  DemoNFT: Address;
  ClaimToken: Address;
  FakeMint: Address;
}

async function main(): Promise<void> {
  const deploymentPath = path.resolve(__dirname, "..", "deployments", "11155111.json");
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8")) as SepoliaDeployment;
  const demoNft = getAddress(deployment.DemoNFT);
  const claimToken = getAddress(deployment.ClaimToken);
  const fakeMint = getAddress(deployment.FakeMint);

  if (!(await isVerifiedOnBlockscout(demoNft))) {
    await verifyWithBlockscoutV2("DemoNFT", demoNft);
  }
  console.info(`DemoNFT verified: ${demoNft}`);

  if (!(await isVerifiedOnBlockscout(fakeMint))) {
    await verifyWithBlockscoutV2("FakeMint", fakeMint);
  }
  console.info(`FakeMint verified: ${fakeMint}`);

  if (await isVerifiedOnBlockscout(claimToken)) {
    throw new Error(`ClaimToken must remain unverified: ${claimToken}`);
  }
  console.info(`ClaimToken remains unverified: ${claimToken}`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
