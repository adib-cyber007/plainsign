import type { Address } from "viem";
import type { Intent } from "../types";

export function collectAddresses(intent: Intent): Address[] {
  const addresses = new Map<string, Address>();
  const visit = (item: Intent): void => {
    for (const address of [item.to, item.spender, item.operator, item.token, item.recipient]) {
      if (address) addresses.set(address.toLowerCase(), address);
    }
    item.children?.forEach(visit);
  };
  visit(intent);
  return [...addresses.values()];
}
