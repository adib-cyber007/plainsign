import { createPublicClient, defineChain, fallback, http } from "viem";

import {
  CHAINS,
  HARDHAT_CHAIN_ID,
  SEPOLIA_CHAIN_ID,
  type SupportedChainId,
} from "./chains";

export function createPlainSignPublicClient(chainId: SupportedChainId) {
  const config = CHAINS[chainId];
  const configuredSepoliaRpc =
    chainId === SEPOLIA_CHAIN_ID
      ? import.meta.env?.VITE_SEPOLIA_RPC?.trim()
      : undefined;
  const rpcUrls = configuredSepoliaRpc
    ? [configuredSepoliaRpc, ...config.rpcUrls]
    : [...config.rpcUrls];

  const chain = defineChain({
    id: config.id,
    name: config.name,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: { http: rpcUrls },
    },
    testnet: chainId === SEPOLIA_CHAIN_ID || chainId === HARDHAT_CHAIN_ID,
  });

  return createPublicClient({
    chain,
    transport: fallback(rpcUrls.map((url) => http(url))),
  });
}
