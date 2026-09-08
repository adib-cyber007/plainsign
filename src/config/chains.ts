export const SEPOLIA_CHAIN_ID = 11_155_111 as const;
export const HARDHAT_CHAIN_ID = 31_337 as const;

export interface PlainSignChainConfig {
  id: number;
  name: string;
  rpcUrls: readonly string[];
  blockscoutBaseUrl?: string;
}

export const CHAINS = {
  [SEPOLIA_CHAIN_ID]: {
    id: SEPOLIA_CHAIN_ID,
    name: "Sepolia",
    rpcUrls: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://sepolia.drpc.org",
    ],
    blockscoutBaseUrl: "https://eth-sepolia.blockscout.com/api/v2/",
  },
  [HARDHAT_CHAIN_ID]: {
    id: HARDHAT_CHAIN_ID,
    name: "Hardhat",
    rpcUrls: ["http://127.0.0.1:8545"],
  },
} as const satisfies Record<number, PlainSignChainConfig>;

export type SupportedChainId = keyof typeof CHAINS;

export function getChainConfig(
  chainId: number,
): PlainSignChainConfig | undefined {
  return CHAINS[chainId as SupportedChainId];
}
