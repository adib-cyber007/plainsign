import type { Address, Hex } from "viem";

import { createPlainSignPublicClient } from "../config/publicRpc";
import { getChainConfig, type SupportedChainId } from "../config/chains";

export interface CodeClient {
  getCode(args: { address: Address }): Promise<Hex | undefined>;
}

export type CodeClientFactory = (chainId: number) => CodeClient;

export async function getCode(
  address: Address,
  chainId: number,
  createClient: CodeClientFactory = defaultClientFactory,
): Promise<Hex | undefined> {
  return createClient(chainId).getCode({ address });
}

function defaultClientFactory(chainId: number): CodeClient {
  if (!getChainConfig(chainId)) {
    throw new Error(`No public RPC is configured for chain ${chainId}.`);
  }
  return createPlainSignPublicClient(chainId as SupportedChainId);
}
