import type { Address } from "viem";

import { getChainConfig, type KnownProtocol } from "../config/chains";

export type AllowlistEntry = KnownProtocol;

export function getAllowlistEntry(
  chainId: number,
  address: Address,
): AllowlistEntry | undefined {
  return getChainConfig(chainId)?.protocols[address.toLowerCase()];
}

export function getAllowlistedAddresses(chainId: number): Address[] {
  return Object.keys(getChainConfig(chainId)?.protocols ?? {}).filter((address): address is Address =>
    /^0x[0-9a-fA-F]{40}$/.test(address),
  );
}

export function domainMatches(
  origin: string,
  domains: readonly string[],
): boolean {
  if (domains.includes("*")) return true;

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }

  return domains.some((domain) => {
    const normalized = domain.toLowerCase().replace(/\.$/, "");
    return host === normalized || host.endsWith(`.${normalized}`);
  });
}
