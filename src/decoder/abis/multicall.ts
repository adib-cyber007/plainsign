import { parseAbi } from "viem";

export const multicallAbi = parseAbi([
  "function multicall(bytes[] data) payable returns (bytes[] results)",
]);
