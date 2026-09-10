import {
  decodeFunctionData,
  toFunctionSelector,
  type Abi,
  type Address,
  type Hex,
} from "viem";

import type { Intent } from "../types";
import { erc20Abi } from "./abis/erc20";
import { erc721Abi } from "./abis/erc721";
import { erc1155Abi } from "./abis/erc1155";
import { multicallAbi } from "./abis/multicall";
import { permit2Abi } from "./abis/permit2";
import { seaportAbi } from "./abis/seaport";
import { universalRouterAbi } from "./abis/universalRouter";
import { wethAbi } from "./abis/weth";

export type TokenStandardHint = "erc20" | "erc721" | "erc1155";

export interface TransactionLike {
  from?: Address;
  to?: Address | null;
  data?: Hex;
  input?: Hex;
  value?: bigint | number | string;
  tokenStandardHint?: TokenStandardHint;
}

interface DecodedCall {
  functionName: string;
  args: readonly unknown[];
}

const UINT256_UNLIMITED_THRESHOLD = 2n ** 255n;
const UINT160_UNLIMITED_THRESHOLD = 2n ** 159n;

const selectors = {
  approve: toFunctionSelector("approve(address,uint256)"),
  increaseAllowance: toFunctionSelector("increaseAllowance(address,uint256)"),
  transfer: toFunctionSelector("transfer(address,uint256)"),
  transferFrom: toFunctionSelector("transferFrom(address,address,uint256)"),
  setApprovalForAll: toFunctionSelector("setApprovalForAll(address,bool)"),
  safeTransferFrom721: toFunctionSelector(
    "safeTransferFrom(address,address,uint256)",
  ),
  safeTransferFrom721Data: toFunctionSelector(
    "safeTransferFrom(address,address,uint256,bytes)",
  ),
  safeTransferFrom1155: toFunctionSelector(
    "safeTransferFrom(address,address,uint256,uint256,bytes)",
  ),
  safeBatchTransferFrom1155: toFunctionSelector(
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
  ),
  permit2Approve: toFunctionSelector("approve(address,address,uint160,uint48)"),
  permit2TransferFrom: toFunctionSelector(
    "transferFrom(address,address,uint160,address)",
  ),
  permit2BatchTransferFrom: toFunctionSelector(
    "transferFrom((address,address,uint160,address)[])",
  ),
  wethDeposit: toFunctionSelector("deposit()"),
  wethWithdraw: toFunctionSelector("withdraw(uint256)"),
  routerExecute: toFunctionSelector("execute(bytes,bytes[],uint256)"),
  routerExecuteNoDeadline: toFunctionSelector("execute(bytes,bytes[])"),
  multicall: toFunctionSelector("multicall(bytes[])"),
};

export function decodeTransaction(
  tx: TransactionLike,
  chainId: number,
): Intent {
  try {
    return decodeTransactionUnsafe(tx, chainId);
  } catch (error) {
    return unknownIntent(tx, transactionData(tx), errorMessage(error));
  }
}

export function isUnlimitedAmount(
  amount: bigint,
  bits: 160 | 256 = 256,
): boolean {
  const threshold =
    bits === 160 ? UINT160_UNLIMITED_THRESHOLD : UINT256_UNLIMITED_THRESHOLD;
  return amount >= threshold;
}

function decodeTransactionUnsafe(tx: TransactionLike, chainId: number): Intent {
  const data = transactionData(tx);
  const value = asBigInt(tx.value ?? 0n);

  if (!tx.to) {
    return {
      kind: "contract_deploy",
      method: "eth_sendTransaction",
      value,
      functionName: "contract deployment",
      raw: tx,
    };
  }

  if ((data === "0x" || data.length < 10) && value > 0n) {
    return {
      kind: "native_transfer",
      method: "eth_sendTransaction",
      to: tx.to,
      recipient: tx.to,
      value,
      functionName: "native transfer",
      raw: tx,
    };
  }

  const selector = data.slice(0, 10) as Hex;
  const base = {
    method: "eth_sendTransaction" as const,
    to: tx.to,
    functionSig: selector,
    raw: tx,
  };

  if (selector === selectors.approve) {
    const { args } = decodeCall(erc20Abi, data);
    const spender = asAddress(args[0]);
    const amount = asBigInt(args[1]);
    if (tx.tokenStandardHint === "erc721") {
      return {
        ...base,
        kind: "erc721_approve",
        token: tx.to,
        spender,
        tokenIds: [amount],
        functionName: "approve",
      };
    }
    return {
      ...base,
      kind: "erc20_approve",
      token: tx.to,
      spender,
      amount,
      isUnlimited: isUnlimitedAmount(amount),
      functionName: "approve",
    };
  }

  if (selector === selectors.increaseAllowance) {
    const { args } = decodeCall(erc20Abi, data);
    const amount = asBigInt(args[1]);
    return {
      ...base,
      kind: "erc20_approve",
      token: tx.to,
      spender: asAddress(args[0]),
      amount,
      isUnlimited: isUnlimitedAmount(amount),
      functionName: "increaseAllowance",
    };
  }

  if (selector === selectors.transfer) {
    const { args } = decodeCall(erc20Abi, data);
    return {
      ...base,
      kind: "erc20_transfer",
      token: tx.to,
      recipient: asAddress(args[0]),
      amount: asBigInt(args[1]),
      functionName: "transfer",
    };
  }

  if (selector === selectors.transferFrom) {
    const abi = tx.tokenStandardHint === "erc721" ? erc721Abi : erc20Abi;
    const { args } = decodeCall(abi, data);
    const amount = asBigInt(args[2]);
    if (tx.tokenStandardHint === "erc721") {
      return {
        ...base,
        kind: "erc721_transfer",
        token: tx.to,
        recipient: asAddress(args[1]),
        tokenIds: [amount],
        functionName: "transferFrom",
      };
    }
    return {
      ...base,
      kind: "erc20_transferFrom",
      token: tx.to,
      recipient: asAddress(args[1]),
      amount,
      functionName: "transferFrom",
    };
  }

  if (selector === selectors.setApprovalForAll) {
    const abi = tx.tokenStandardHint === "erc1155" ? erc1155Abi : erc721Abi;
    const { args } = decodeCall(abi, data);
    return {
      ...base,
      kind:
        tx.tokenStandardHint === "erc1155"
          ? "erc1155_setApprovalForAll"
          : "erc721_setApprovalForAll",
      token: tx.to,
      operator: asAddress(args[0]),
      approved: asBoolean(args[1]),
      functionName: "setApprovalForAll",
    };
  }

  if (
    selector === selectors.safeTransferFrom721 ||
    selector === selectors.safeTransferFrom721Data
  ) {
    const { args } = decodeCall(erc721Abi, data);
    return {
      ...base,
      kind: "erc721_transfer",
      token: tx.to,
      recipient: asAddress(args[1]),
      tokenIds: [asBigInt(args[2])],
      functionName: "safeTransferFrom",
    };
  }

  if (selector === selectors.safeTransferFrom1155) {
    const { args } = decodeCall(erc1155Abi, data);
    return {
      ...base,
      kind: "erc1155_transfer",
      token: tx.to,
      recipient: asAddress(args[1]),
      tokenIds: [asBigInt(args[2])],
      amount: asBigInt(args[3]),
      functionName: "safeTransferFrom",
    };
  }

  if (selector === selectors.safeBatchTransferFrom1155) {
    const { args } = decodeCall(erc1155Abi, data);
    const amounts = asBigIntArray(args[3]);
    return {
      ...base,
      kind: "erc1155_transfer",
      token: tx.to,
      recipient: asAddress(args[1]),
      tokenIds: asBigIntArray(args[2]),
      amount: amounts.reduce((sum, amount) => sum + amount, 0n),
      functionName: "safeBatchTransferFrom",
    };
  }

  const special = decodeSpecialTransaction(
    { ...tx, to: tx.to },
    data,
    selector,
    chainId,
  );
  return special ?? unknownIntent(tx, data);
}

function decodeSpecialTransaction(
  tx: TransactionLike & { to: Address },
  data: Hex,
  selector: Hex,
  chainId: number,
): Intent | undefined {
  const base = {
    method: "eth_sendTransaction" as const,
    to: tx.to,
    functionSig: selector,
    raw: tx,
  };

  const permit2 = tryDecodeCall(permit2Abi, data);
  if (permit2?.functionName === "approve") {
    const amount = asBigInt(permit2.args[2]);
    return {
      ...base,
      kind: "erc20_approve",
      token: asAddress(permit2.args[0]),
      spender: asAddress(permit2.args[1]),
      amount,
      deadline: asNumber(permit2.args[3]),
      isUnlimited: isUnlimitedAmount(amount, 160),
      functionName: "approve",
    };
  }

  if (permit2?.functionName === "permit") {
    const permit = asRecord(permit2.args[1]);
    const details = permit.details;
    const spender = asAddress(permit.spender);
    const deadline = asNumber(permit.sigDeadline);
    if (Array.isArray(details)) {
      const children = details.map((detail) =>
        permit2DetailIntent(detail, spender, deadline, tx),
      );
      return {
        ...base,
        kind: "permit2_batch",
        spender,
        deadline,
        isUnlimited: children.some((child) => child.isUnlimited),
        children,
        functionName: "permit",
      };
    }

    return {
      ...base,
      ...permit2DetailFields(details),
      kind: "permit2_single",
      spender,
      deadline,
      functionName: "permit",
    };
  }

  if (permit2?.functionName === "transferFrom") {
    if (Array.isArray(permit2.args[0])) {
      const children = permit2.args[0].map((detail) => {
        const item = asRecord(detail);
        return {
          kind: "permit2_transferFrom" as const,
          method: "eth_sendTransaction" as const,
          token: asAddress(item.token),
          recipient: asAddress(item.to),
          amount: asBigInt(item.amount),
          functionName: "transferFrom",
          functionSig: selector,
          raw: detail,
        };
      });
      return {
        ...base,
        kind: "permit2_transferFrom",
        children,
        functionName: "transferFrom",
      };
    }

    return {
      ...base,
      kind: "permit2_transferFrom",
      token: asAddress(permit2.args[3]),
      recipient: asAddress(permit2.args[1]),
      amount: asBigInt(permit2.args[2]),
      functionName: "transferFrom",
    };
  }

  const weth = tryDecodeCall(wethAbi, data);
  if (weth?.functionName === "deposit") {
    return {
      ...base,
      kind: "weth_wrap",
      token: tx.to,
      value: asBigInt(tx.value ?? 0n),
      functionName: "deposit",
    };
  }
  if (weth?.functionName === "withdraw") {
    return {
      ...base,
      kind: "weth_unwrap",
      token: tx.to,
      amount: asBigInt(weth.args[0]),
      functionName: "withdraw",
    };
  }

  const router = tryDecodeCall(universalRouterAbi, data);
  if (router?.functionName === "execute") {
    const possibleDeadline = router.args[2];
    return {
      ...base,
      kind: "swap",
      deadline:
        possibleDeadline === undefined ? undefined : asNumber(possibleDeadline),
      functionName: "execute",
    };
  }

  const seaport = tryDecodeCall(seaportAbi, data);
  if (seaport?.functionName.startsWith("fulfill")) {
    return {
      ...base,
      kind: "seaport_order",
      functionName: seaport.functionName,
    };
  }

  const multicall = tryDecodeCall(multicallAbi, data);
  if (multicall?.functionName === "multicall") {
    const calls = Array.isArray(multicall.args[0]) ? multicall.args[0] : [];
    return {
      ...base,
      kind: "multicall",
      children: calls.map((call) =>
        decodeTransaction(
          {
            to: tx.to,
            data: asHex(call),
            value: 0n,
            tokenStandardHint: tx.tokenStandardHint,
          },
          chainId,
        ),
      ),
      functionName: "multicall",
    };
  }

  return undefined;
}

function permit2DetailIntent(
  detail: unknown,
  spender: Address,
  deadline: number,
  raw: unknown,
): Intent {
  return {
    kind: "permit2_single",
    method: "eth_sendTransaction",
    ...permit2DetailFields(detail),
    spender,
    deadline,
    functionName: "permit",
    raw,
  };
}

function permit2DetailFields(detail: unknown): {
  token: Address;
  amount: bigint;
  deadline: number;
  isUnlimited: boolean;
} {
  const record = asRecord(detail);
  const amount = asBigInt(record.amount);
  return {
    token: asAddress(record.token),
    amount,
    deadline: asNumber(record.expiration),
    isUnlimited: isUnlimitedAmount(amount, 160),
  };
}

function unknownIntent(
  tx: TransactionLike,
  data: Hex,
  decodeError?: string,
): Intent {
  return {
    kind: "unknown_function",
    method: "eth_sendTransaction",
    to: tx.to ?? undefined,
    value: asBigInt(tx.value ?? 0n),
    functionSig: data.length >= 10 ? (data.slice(0, 10) as Hex) : data,
    raw: tx,
    decodeError,
  };
}

function decodeCall(abi: Abi, data: Hex): DecodedCall {
  const decoded = decodeFunctionData({ abi, data });
  return {
    functionName: decoded.functionName,
    args: decoded.args ?? [],
  };
}

function tryDecodeCall(abi: Abi, data: Hex): DecodedCall | undefined {
  try {
    return decodeCall(abi, data);
  } catch {
    return undefined;
  }
}

function transactionData(tx: TransactionLike): Hex {
  return tx.data ?? tx.input ?? "0x";
}

function asAddress(value: unknown): Address {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new TypeError("Expected an Ethereum address.");
  }
  return value as Address;
}

function asHex(value: unknown): Hex {
  if (typeof value !== "string" || !/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    throw new TypeError("Expected hex data.");
  }
  return value as Hex;
}

function asBigInt(value: unknown): bigint {
  if (
    typeof value !== "bigint" &&
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new TypeError("Expected an integer value.");
  }
  return BigInt(value);
}

function asBigIntArray(value: unknown): bigint[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected an integer array.");
  }
  return value.map(asBigInt);
}

function asNumber(value: unknown): number {
  const parsed = Number(asBigInt(value));
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError("Integer does not fit in a JavaScript number.");
  }
  return parsed;
}

function asBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError("Expected a boolean value.");
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Expected a tuple value.");
  }
  return value as Record<string, unknown>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
