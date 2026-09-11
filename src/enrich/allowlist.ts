import type { Address } from "viem";

import localDeployment from "../../contracts/deployments/31337.json";
import allowlistJson from "../config/allowlist.json";

export interface AllowlistEntry {
  protocol: string;
  domains: string[];
}

type AllowlistConfig = Record<string, Record<string, AllowlistEntry>>;

const configuredAllowlist = allowlistJson as AllowlistConfig;
const localWeth = localDeployment.WETH9?.toLowerCase();
const allowlist: AllowlistConfig = {
  ...configuredAllowlist,
  "31337": localWeth
    ? {
        [localWeth]: {
          protocol: "Wrapped Ether (WETH, local)",
          domains: ["*"],
        },
      }
    : {},
};

export function getAllowlistEntry(
  chainId: number,
  address: Address,
): AllowlistEntry | undefined {
  return allowlist[String(chainId)]?.[address.toLowerCase()];
}

export function getAllowlistedAddresses(chainId: number): Address[] {
  return Object.keys(allowlist[String(chainId)] ?? {}).filter((address): address is Address =>
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
