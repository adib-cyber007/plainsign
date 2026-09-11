import { encodeFunctionData, zeroAddress, type Address } from "viem";

import { erc20Abi } from "./decoder/abis/erc20";
import { erc721Abi } from "./decoder/abis/erc721";
import type { AnalysisRequest, Intent, RevokeTransaction } from "./types";

export function buildRevokeTransaction(
  request: AnalysisRequest,
  intent: Intent,
): RevokeTransaction | undefined {
  if (request.request.method !== "eth_sendTransaction" || !intent.token) {
    return undefined;
  }

  const data = revokeCalldata(intent);
  if (!data) return undefined;

  return {
    from: request.from,
    to: intent.token,
    data,
  };
}

function revokeCalldata(intent: Intent): `0x${string}` | undefined {
  if (
    intent.kind === "erc20_approve" &&
    intent.spender &&
    sameAddress(intent.to, intent.token)
  ) {
    return encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [intent.spender, 0n],
    });
  }

  if (
    intent.kind === "erc721_approve" &&
    intent.tokenIds?.length === 1
  ) {
    return encodeFunctionData({
      abi: erc721Abi,
      functionName: "approve",
      args: [zeroAddress, intent.tokenIds[0]],
    });
  }

  if (
    (intent.kind === "erc721_setApprovalForAll" ||
      intent.kind === "erc1155_setApprovalForAll") &&
    intent.operator
  ) {
    return encodeFunctionData({
      abi: erc721Abi,
      functionName: "setApprovalForAll",
      args: [intent.operator, false],
    });
  }

  return undefined;
}

function sameAddress(left?: Address, right?: Address): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}
