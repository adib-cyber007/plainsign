import { decodeFunctionData, zeroAddress, type Address } from "viem";
import { describe, expect, it } from "vitest";

import { erc20Abi } from "../../src/decoder/abis/erc20";
import { erc721Abi } from "../../src/decoder/abis/erc721";
import { buildRevokeTransaction } from "../../src/revoke";
import type { AnalysisRequest, Intent } from "../../src/types";

const owner = "0x1111111111111111111111111111111111111111" as Address;
const token = "0x2222222222222222222222222222222222222222" as Address;
const spender = "0x3333333333333333333333333333333333333333" as Address;

function request(): AnalysisRequest {
  return {
    id: "revoke-test",
    origin: "https://example.test",
    chainId: 1,
    from: owner,
    request: { method: "eth_sendTransaction", params: [] },
  };
}

function intent(fields: Partial<Intent>): Intent {
  return {
    kind: "erc20_approve",
    method: "eth_sendTransaction",
    to: token,
    token,
    spender,
    raw: {},
    ...fields,
  };
}

describe("buildRevokeTransaction", () => {
  it("turns an ERC-20 permission into approve(spender, 0)", () => {
    const transaction = buildRevokeTransaction(request(), intent({}));

    expect(transaction).toMatchObject({ from: owner, to: token });
    expect(
      decodeFunctionData({ abi: erc20Abi, data: transaction!.data }),
    ).toEqual({ functionName: "approve", args: [spender, 0n] });
  });

  it("turns collection-wide permission into setApprovalForAll(operator, false)", () => {
    const transaction = buildRevokeTransaction(
      request(),
      intent({
        kind: "erc721_setApprovalForAll",
        spender: undefined,
        operator: spender,
        approved: true,
      }),
    );

    expect(
      decodeFunctionData({ abi: erc721Abi, data: transaction!.data }),
    ).toEqual({ functionName: "setApprovalForAll", args: [spender, false] });
  });

  it("clears a single ERC-721 permission with the zero address", () => {
    const transaction = buildRevokeTransaction(
      request(),
      intent({
        kind: "erc721_approve",
        tokenIds: [42n],
      }),
    );

    expect(
      decodeFunctionData({ abi: erc721Abi, data: transaction!.data }),
    ).toEqual({ functionName: "approve", args: [zeroAddress, 42n] });
  });

  it("does not mislabel a Permit2 internal approval as a token revoke", () => {
    expect(
      buildRevokeTransaction(
        request(),
        intent({ to: "0x4444444444444444444444444444444444444444" }),
      ),
    ).toBeUndefined();
  });
});
