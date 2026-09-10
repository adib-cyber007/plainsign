import { readFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import { getAddress, isAddress, parseEther, type Address, type Hex } from "viem";

interface LocalDeployment {
  DemoNFT: Address;
  ClaimToken: Address;
  FakeMint: Address;
  WETH9: Address;
  attacker: Address;
  deployedAt: string;
}

async function main(): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  if (chainId !== 31337) throw new Error("fund-and-mint.ts only runs on chain 31337.");

  const wallets = await hre.viem.getWalletClients();
  const deployer = wallets[0];
  const victim = resolveVictim(wallets.map((wallet) => wallet.account.address));
  const deployment = await readDeployment();

  console.info(`Victim address: ${victim}`);
  console.info(`Attacker address: ${deployment.attacker}`);

  await waitFor(
    deployer.sendTransaction({ account: deployer.account, to: victim, value: parseEther("10") }),
    publicClient,
  );

  const demoNft = await hre.viem.getContractAt("DemoNFT", deployment.DemoNFT);
  const claimToken = await hre.viem.getContractAt("ClaimToken", deployment.ClaimToken);
  await waitFor(demoNft.write.mint([victim]), publicClient);
  await waitFor(demoNft.write.mint([victim]), publicClient);
  await waitFor(claimToken.write.faucet([victim]), publicClient);

  console.info("✅ Victim funded");
}

function resolveVictim(addresses: Address[]): Address {
  const configured = process.env.VICTIM_ADDRESS?.trim();
  if (configured) {
    if (!isAddress(configured)) throw new Error("VICTIM_ADDRESS is not a valid address.");
    return getAddress(configured);
  }
  if (!addresses[1]) throw new Error("Hardhat account #1 is unavailable.");
  console.info("VICTIM_ADDRESS is unset; using Hardhat account #1.");
  return getAddress(addresses[1]);
}

async function readDeployment(): Promise<LocalDeployment> {
  const file = path.resolve(__dirname, "..", "deployments", "31337.json");
  return JSON.parse(await readFile(file, "utf8")) as LocalDeployment;
}

async function waitFor(
  transaction: Promise<Hex>,
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
): Promise<void> {
  const hash = await transaction;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted.`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
