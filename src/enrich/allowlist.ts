import type { Address } from "viem";

import allowlistJson from "../config/allowlist.json";

export interface AllowlistEntry {
  protocol: string;
  domains: string[];
}

type AllowlistConfig = Record<string, Record<string, AllowlistEntry>>;

const allowlist = allowlistJson as AllowlistConfig;

export function getAllowlistEntry(
  chainId: number,
  address: Address,
): AllowlistEntry | undefined {
  return allowlist[String(chainId)]?.[address.toLowerCase()];
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
