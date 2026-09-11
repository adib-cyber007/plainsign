import hre from "hardhat";
import type { Address } from "viem";

const BLOCKSCOUT_BASE_URL = "https://eth-sepolia.blockscout.com";
const MAX_RETRIES = 3;

export type PublicDemoContract = "DemoNFT" | "FakeMint";

export async function verifyWithBlockscoutV2(
  contractName: PublicDemoContract,
  address: Address,
): Promise<void> {
  const fullyQualifiedName = `contracts/${contractName}.sol:${contractName}`;
  const buildInfo = await hre.artifacts.getBuildInfo(fullyQualifiedName);
  if (!buildInfo) {
    throw new Error(`No Hardhat build info found for ${fullyQualifiedName}.`);
  }

  const compilerInput = structuredClone(buildInfo.input);
  compilerInput.sources = Object.fromEntries(
    Object.entries(compilerInput.sources).filter(
      ([sourceName]) =>
        sourceName === `contracts/${contractName}.sol` ||
        (contractName === "DemoNFT" && sourceName.startsWith("@openzeppelin/")),
    ),
  );

  const form = new FormData();
  form.append("compiler_version", `v${buildInfo.solcLongVersion}`);
  form.append("contract_name", contractName);
  form.append(
    "files[0]",
    new Blob([JSON.stringify(compilerInput)], { type: "application/json" }),
    "standard-input.json",
  );
  form.append("autodetect_constructor_args", "true");
  form.append("license_type", "mit");

  await retry(`submit ${contractName} to Blockscout v2`, async () => {
    const response = await fetch(
      `${BLOCKSCOUT_BASE_URL}/api/v2/smart-contracts/${address}/verification/via/standard-input`,
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Blockscout returned HTTP ${response.status}: ${detail}`);
    }
  });

  await retry(`confirm ${contractName} verification`, async () => {
    if (!(await isVerifiedOnBlockscout(address))) {
      throw new Error("Blockscout has not indexed the verified source yet.");
    }
  });
}

export async function isVerifiedOnBlockscout(address: Address): Promise<boolean> {
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
}

async function retry<T>(label: string, operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      const delayMs = 1_000 * 2 ** attempt;
      console.warn(
        `${label} failed (${errorMessage(error)}); retry ${attempt + 1}/${MAX_RETRIES} in ${delayMs} ms.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
