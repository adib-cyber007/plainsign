import hre from "hardhat";
import { formatEther, parseEther } from "viem";

const minimum = parseEther("0.05");

async function main(): Promise<void> {
  const publicClient = await hre.viem.getPublicClient();
  const [deployer] = await hre.viem.getWalletClients();
  if (!deployer) throw new Error("No Sepolia deployer wallet is configured.");

  const chainId = await retry(() => publicClient.getChainId());
  if (chainId !== 11155111) throw new Error(`Expected Sepolia, received chain ${chainId}.`);
  const balance = await retry(() =>
    publicClient.getBalance({ address: deployer.account.address }),
  );
  console.info(`Sepolia deployer: ${deployer.account.address}`);
  console.info(`Sepolia balance: ${formatEther(balance)} ETH`);
  if (balance < minimum) {
    throw new Error(
      `${formatEther(minimum - balance)} ETH more is required before deployment (minimum 0.05 ETH).`,
    );
  }
  console.info("Preflight passed. No transaction was sent.");
}

async function retry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
