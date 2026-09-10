import type { Address } from "viem";

import type { AddressInfo } from "../types";

export async function getBlockscoutInfo(
  _address: Address,
  _chainId: number,
): Promise<Partial<AddressInfo>> {
  void _address;
  void _chainId;
  return {};
}
