import localDeployment from "../../contracts/deployments/31337.json";
import protocolConfig from "./allowlist.json";

export const MAINNET_CHAIN_ID = 1 as const;
export const SEPOLIA_CHAIN_ID = 11_155_111 as const;
export const HARDHAT_CHAIN_ID = 31_337 as const;

export interface KnownProtocol {
  protocol: string;
  domains: string[];
}

export interface PlainSignChainConfig {
  id: number;
  name: string;
  rpcUrls: readonly string[];
  blockscoutBaseUrl?: string;
  testnet: boolean;
  wethAddress: `0x${string}`;
  protocols: Record<string, KnownProtocol>;
}

export const CHAINS = {
  [MAINNET_CHAIN_ID]: {
    id: MAINNET_CHAIN_ID,
    name: "Ethereum",
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.drpc.org"],
    blockscoutBaseUrl: "https://eth.blockscout.com/api/v2/",
    testnet: false,
    wethAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    protocols: protocolConfig["1"],
  },
  [SEPOLIA_CHAIN_ID]: {
    id: SEPOLIA_CHAIN_ID,
    name: "Sepolia",
    rpcUrls: [
      "https://ethereum-sepolia-rpc.publicnode.com",
      "https://sepolia.drpc.org",
    ],
    blockscoutBaseUrl: "https://eth-sepolia.blockscout.com/api/v2/",
    testnet: true,
    wethAddress: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14",
    protocols: protocolConfig["11155111"],
  },
  [HARDHAT_CHAIN_ID]: {
    id: HARDHAT_CHAIN_ID,
    name: "Hardhat",
    rpcUrls: ["http://127.0.0.1:8545"],
    testnet: true,
    wethAddress: localDeployment.WETH9 as `0x${string}`,
    protocols: {
      [localDeployment.WETH9.toLowerCase()]: {
        protocol: "Wrapped Ether (WETH, local)",
        domains: ["*"],
      },
    },
  },
} as const satisfies Record<number, PlainSignChainConfig>;

export type SupportedChainId = keyof typeof CHAINS;

export function getChainConfig(
  chainId: number,
): PlainSignChainConfig | undefined {
  return CHAINS[chainId as SupportedChainId];
}
