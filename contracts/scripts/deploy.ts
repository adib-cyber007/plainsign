import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import { getAddress, isAddress, type Address } from "viem";

interface Deployment {
  DemoNFT: Address;
  ClaimToken: Address;
  FakeMint: Address;
  WETH9?: Address;
  attacker: Address;
  deployedAt: string;
}

async function main(): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();
  const wallets = await hre.viem.getWalletClients();
  const chainId = await publicClient.getChainId();
  const attacker = resolveAttacker(chainId, wallets.map((wallet) => wallet.account.address));

  console.info(`Attacker address: ${attacker}`);
  const demoNft = await hre.viem.deployContract("DemoNFT");
  const claimToken = await hre.viem.deployContract("ClaimToken");
  const fakeMint = await hre.viem.deployContract("FakeMint");
  const weth9 = chainId === 31337 ? await hre.viem.deployContract("WETH9") : undefined;

  const deployment: Deployment = {
    DemoNFT: demoNft.address,
    ClaimToken: claimToken.address,
    FakeMint: fakeMint.address,
    ...(weth9 ? { WETH9: weth9.address } : {}),
    attacker,
    deployedAt: new Date().toISOString(),
  };
  const deploymentsDirectory = path.resolve(__dirname, "..", "deployments");
  await mkdir(deploymentsDirectory, { recursive: true });
  const outputPath = path.join(deploymentsDirectory, `${chainId}.json`);
  await writeFile(outputPath, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  console.info(`Deployment written to ${outputPath}`);
}

function resolveAttacker(chainId: number, addresses: Address[]): Address {
  const configured = process.env.ATTACKER_ADDRESS?.trim();
  if (configured) {
    if (!isAddress(configured)) throw new Error("ATTACKER_ADDRESS is not a valid address.");
    return getAddress(configured);
  }
  if (chainId === 31337 && addresses[19]) {
    console.info("ATTACKER_ADDRESS is unset; using Hardhat account #19.");
    return getAddress(addresses[19]);
  }
  throw new Error("ATTACKER_ADDRESS is required outside the local Hardhat chain.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
