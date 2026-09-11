import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import {
  formatEther,
  getAddress,
  isAddress,
  parseEther,
  type Address,
  type Hex,
} from "viem";

import { verifyWithBlockscoutV2, type PublicDemoContract } from "./blockscout-verify";

const SEPOLIA_CHAIN_ID = 11_155_111;
const MINIMUM_SEPOLIA_BALANCE = parseEther("0.05");
const BLOCKSCOUT_BASE_URL = "https://eth-sepolia.blockscout.com";
const MAX_RPC_RETRIES = 3;

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
  const deployer = wallets[0];
  if (!deployer) throw new Error("No deployer wallet is configured.");
  const chainId = await retryRpc("read chain ID", () => publicClient.getChainId());
  const attacker = resolveAttacker(chainId, wallets.map((wallet) => wallet.account.address));
  const victim = resolveVictim(chainId, wallets.map((wallet) => wallet.account.address));

  if (chainId === SEPOLIA_CHAIN_ID) {
    const balance = await retryRpc("read deployer balance", () =>
      publicClient.getBalance({ address: deployer.account.address }),
    );
    if (balance < MINIMUM_SEPOLIA_BALANCE) {
      const missing = MINIMUM_SEPOLIA_BALANCE - balance;
      throw new Error(
        `Sepolia deployer ${deployer.account.address} has ${formatEther(balance)} ETH; ` +
          `${formatEther(missing)} ETH more is required before deployment (minimum 0.05 ETH).`,
      );
    }
    console.info(
      `Sepolia deployer ${deployer.account.address}: ${formatEther(balance)} ETH available`,
    );
  }

  console.info(`Attacker address: ${attacker}`);
  console.info(`Victim address: ${victim}`);
  const demoNftAddress = await deployOnce("DemoNFT", deployer, publicClient);
  const claimTokenAddress = await deployOnce("ClaimToken", deployer, publicClient);
  const fakeMintAddress = await deployOnce("FakeMint", deployer, publicClient);
  const demoNft = await hre.viem.getContractAt("DemoNFT", demoNftAddress);
  const claimToken = await hre.viem.getContractAt("ClaimToken", claimTokenAddress);
  const fakeMint = await hre.viem.getContractAt("FakeMint", fakeMintAddress);
  const weth9 =
    chainId === 31337
      ? await hre.viem.getContractAt(
          "WETH9",
          await deployOnce("WETH9", deployer, publicClient),
        )
      : undefined;

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

  if (chainId === SEPOLIA_CHAIN_ID) {
    await waitFor(
      demoNft.write.mint([victim]),
      publicClient,
    );
    await waitFor(
      demoNft.write.mint([victim]),
      publicClient,
    );
    await waitFor(
      claimToken.write.faucet([victim]),
      publicClient,
    );
    console.info("Minted 2 DemoNFTs and 1000 CLAIM to the victim.");

    await verifyContract("DemoNFT", demoNft.address);
    await verifyContract("FakeMint", fakeMint.address);
    console.info("ClaimToken intentionally left unverified.");

    const [demoVerified, fakeMintVerified, claimVerified] = await Promise.all([
      blockscoutVerified(demoNft.address),
      blockscoutVerified(fakeMint.address),
      blockscoutVerified(claimToken.address),
    ]);
    if (!demoVerified || !fakeMintVerified || claimVerified) {
      throw new Error(
        "Blockscout verification mismatch: expected DemoNFT=true, FakeMint=true, ClaimToken=false; " +
          `received ${demoVerified}, ${fakeMintVerified}, ${claimVerified}.`,
      );
    }

    console.info("Blockscout verification: DemoNFT verified; FakeMint verified; ClaimToken unverified.");
    for (const [name, address] of [
      ["DemoNFT", demoNft.address],
      ["ClaimToken", claimToken.address],
      ["FakeMint", fakeMint.address],
    ] as const) {
      console.info(`${name}: ${address} (${BLOCKSCOUT_BASE_URL}/address/${address})`);
    }
  }
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

function resolveVictim(chainId: number, addresses: Address[]): Address {
  const configured = process.env.VICTIM_ADDRESS?.trim();
  if (configured) {
    if (!isAddress(configured)) throw new Error("VICTIM_ADDRESS is not a valid address.");
    return getAddress(configured);
  }
  if (chainId === 31337 && addresses[1]) {
    console.info("VICTIM_ADDRESS is unset; using Hardhat account #1.");
    return getAddress(addresses[1]);
  }
  throw new Error("VICTIM_ADDRESS is required outside the local Hardhat chain.");
}

async function waitFor(
  transaction: Promise<Hex>,
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
): Promise<void> {
  const hash = await transaction;
  const receipt = await retryRpc("wait for transaction receipt", () =>
    publicClient.waitForTransactionReceipt({ hash }),
  );
  if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted.`);
}

async function deployOnce(
  contractName: string,
  walletClient: Awaited<ReturnType<typeof hre.viem.getWalletClients>>[number],
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
): Promise<Address> {
  const artifact = await hre.artifacts.readArtifact(contractName);
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as Hex,
    account: walletClient.account,
  });
  const receipt = await retryRpc(`wait for ${contractName} deployment`, () =>
    publicClient.waitForTransactionReceipt({ hash }),
  );
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`${contractName} deployment ${hash} did not succeed.`);
  }
  console.info(`${contractName} deployed: ${receipt.contractAddress}`);
  return getAddress(receipt.contractAddress);
}

async function verifyContract(name: string, address: Address): Promise<void> {
  try {
    await retryRpc(`verify ${name}`, async () => {
      try {
        await hre.run("verify:verify", { address });
      } catch (error) {
        const message = errorMessage(error);
        if (!message.toLowerCase().includes("already verified")) throw error;
      }
    });
  } catch (error) {
    console.warn(
      `Legacy Blockscout verification failed (${errorMessage(error)}); using the v2 API.`,
    );
    await verifyWithBlockscoutV2(name as PublicDemoContract, address);
  }
}

async function blockscoutVerified(address: Address): Promise<boolean> {
  return retryRpc(`check Blockscout status for ${address}`, async () => {
    const response = await fetch(`${BLOCKSCOUT_BASE_URL}/api/v2/addresses/${address}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Blockscout returned HTTP ${response.status}.`);
    const payload = (await response.json()) as { is_verified?: unknown };
    if (typeof payload.is_verified !== "boolean") {
      throw new Error("Blockscout response did not include is_verified.");
    }
    return payload.is_verified;
  });
}

async function retryRpc<T>(label: string, operation: () => Promise<T>): Promise<T> {
  for (let retry = 0; ; retry += 1) {
    try {
      return await operation();
    } catch (error) {
      if (retry >= MAX_RPC_RETRIES) throw error;
      const delayMs = 500 * 2 ** retry;
      console.warn(
        `${label} failed (${errorMessage(error)}); retry ${retry + 1}/${MAX_RPC_RETRIES} in ${delayMs} ms.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void main().catch((error) => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
