import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  encodeFunctionData,
  maxUint256,
  type Abi,
  type Address,
  type Hex,
} from "viem";

import { erc1155Abi } from "../../src/decoder/abis/erc1155";
import { erc20Abi } from "../../src/decoder/abis/erc20";
import { erc721Abi } from "../../src/decoder/abis/erc721";
import { multicallAbi } from "../../src/decoder/abis/multicall";
import { permit2Abi } from "../../src/decoder/abis/permit2";
import { seaportAbi } from "../../src/decoder/abis/seaport";
import { universalRouterAbi } from "../../src/decoder/abis/universalRouter";
import { wethAbi } from "../../src/decoder/abis/weth";
import { serialize } from "../../src/bridge/protocol";
import { decodeMessage } from "../../src/decoder/message";
import { decodeTransaction, type TransactionLike } from "../../src/decoder/tx";
import { decodeTypedData } from "../../src/decoder/typedData";
import type { Intent, InterceptedMethod } from "../../src/types";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;
const Z = `0x${"00".repeat(32)}` as Hex;
const MAX160 = 2n ** 160n - 1n;
const NOW = 1_800_000_000;

function encode(
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
): Hex {
  return encodeFunctionData({ abi, functionName, args } as never);
}

function withoutRaw(intent: Intent): Omit<Intent, "raw"> {
  const copy = { ...intent } as Partial<Intent>;
  delete copy.raw;
  if (intent.children)
    copy.children = intent.children.map(withoutRaw) as Intent[];
  return copy as Omit<Intent, "raw">;
}

async function save(
  folder: string,
  name: string,
  value: unknown,
): Promise<void> {
  const directory = resolve("tests", "fixtures", folder);
  await mkdir(directory, { recursive: true });
  await writeFile(
    resolve(directory, `${name}.json`),
    `${JSON.stringify(serialize(value), null, 2)}\n`,
  );
}

async function tx(name: string, input: TransactionLike): Promise<void> {
  await save("tx", name, {
    input,
    expected: withoutRaw(decodeTransaction(input, 11155111)),
  });
}

async function typed(name: string, input: unknown): Promise<void> {
  await save("typed", name, {
    input,
    expected: withoutRaw(decodeTypedData(input, "eth_signTypedData_v4")),
  });
}

async function message(
  name: string,
  input: unknown,
  method: InterceptedMethod,
): Promise<void> {
  if (method !== "personal_sign" && method !== "eth_sign") {
    throw new TypeError("Expected a message signing method.");
  }
  await save("msg", name, {
    input,
    method,
    expected: withoutRaw(decodeMessage(input, method)),
  });
}

const permitSingle = {
  details: {
    token: A,
    amount: MAX160,
    expiration: NOW + 10 * 365 * 86_400,
    nonce: 0,
  },
  spender: B,
  sigDeadline: NOW + 10 * 365 * 86_400,
};

await tx("01-erc20-approve-limited", {
  to: A,
  data: encode(erc20Abi, "approve", [B, 1_000n]),
});
await tx("02-erc20-approve-unlimited", {
  to: A,
  data: encode(erc20Abi, "approve", [B, maxUint256]),
});
await tx("03-erc20-approve-uint96", {
  to: A,
  data: encode(erc20Abi, "approve", [B, 2n ** 96n - 1n]),
});
await tx("04-erc20-increase", {
  to: A,
  data: encode(erc20Abi, "increaseAllowance", [B, 10n]),
});
await tx("05-erc20-transfer", {
  to: A,
  data: encode(erc20Abi, "transfer", [B, 20n]),
});
await tx("06-erc20-transfer-from", {
  to: A,
  data: encode(erc20Abi, "transferFrom", [C, B, 30n]),
});
await tx("07-erc721-approve", {
  to: A,
  tokenStandardHint: "erc721",
  data: encode(erc721Abi, "approve", [B, 7n]),
});
await tx("08-erc721-all-true", {
  to: A,
  data: encode(erc721Abi, "setApprovalForAll", [B, true]),
});
await tx("09-erc721-all-false", {
  to: A,
  data: encode(erc721Abi, "setApprovalForAll", [B, false]),
});
await tx("10-erc721-transfer-from", {
  to: A,
  tokenStandardHint: "erc721",
  data: encode(erc721Abi, "transferFrom", [C, B, 8n]),
});
await tx("11-erc721-safe-transfer", {
  to: A,
  data: encode(erc721Abi, "safeTransferFrom", [C, B, 9n]),
});
await tx("12-erc721-safe-transfer-data", {
  to: A,
  data: encode(erc721Abi, "safeTransferFrom", [C, B, 10n, "0x1234"]),
});
await tx("13-erc1155-all", {
  to: A,
  tokenStandardHint: "erc1155",
  data: encode(erc1155Abi, "setApprovalForAll", [B, true]),
});
await tx("14-erc1155-transfer", {
  to: A,
  data: encode(erc1155Abi, "safeTransferFrom", [C, B, 11n, 2n, "0x"]),
});
await tx("15-erc1155-batch", {
  to: A,
  data: encode(erc1155Abi, "safeBatchTransferFrom", [
    C,
    B,
    [1n, 2n],
    [3n, 4n],
    "0x",
  ]),
});
await tx("16-permit2-approve", {
  to: C,
  data: encode(permit2Abi, "approve", [A, B, MAX160, NOW]),
});
await tx("17-permit2-permit", {
  to: C,
  data: encode(permit2Abi, "permit", [A, permitSingle, "0x12"]),
});
await tx("18-permit2-transfer", {
  to: C,
  data: encode(permit2Abi, "transferFrom", [A, B, 12n, C]),
});
await tx("19-weth-deposit", {
  to: A,
  value: 10n ** 16n,
  data: encode(wethAbi, "deposit"),
});
await tx("20-weth-withdraw", {
  to: A,
  data: encode(wethAbi, "withdraw", [10n ** 16n]),
});
await tx("21-router", {
  to: A,
  data: encode(universalRouterAbi, "execute", ["0x00", ["0x"], NOW]),
});
const basicOrder = {
  considerationToken: A,
  considerationIdentifier: 0n,
  considerationAmount: 1n,
  offerer: B,
  zone: C,
  offerToken: A,
  offerIdentifier: 1n,
  offerAmount: 1n,
  basicOrderType: 0,
  startTime: 0n,
  endTime: BigInt(NOW),
  zoneHash: Z,
  salt: 1n,
  offererConduitKey: Z,
  fulfillerConduitKey: Z,
  totalOriginalAdditionalRecipients: 0n,
  additionalRecipients: [],
  signature: "0x12",
};
await tx("22-seaport", {
  to: A,
  data: encode(seaportAbi, "fulfillBasicOrder", [basicOrder]),
});
const nested = encode(erc20Abi, "approve", [B, maxUint256]);
await tx("23-multicall", {
  to: A,
  data: encode(multicallAbi, "multicall", [[nested]]),
});
await tx("24-native", { to: B, value: 10n ** 18n, data: "0x" });
await tx("25-deploy", { value: 0n, data: "0x6000" });
await tx("26-unknown", { to: A, data: "0xdeadbeef" });

const domain = { name: "Test", chainId: 11155111, verifyingContract: A };
await typed("01-permit-object", {
  primaryType: "Permit",
  domain,
  message: { spender: B, value: maxUint256, deadline: NOW },
});
await typed("02-permit-json", [
  B,
  JSON.stringify({
    primaryType: "Permit",
    domain,
    message: { spender: B, value: "100", deadline: NOW },
  }),
]);
await typed("03-permit-single", [
  { primaryType: "PermitSingle", domain, message: permitSingle },
  A,
]);
await typed("04-permit-batch", {
  primaryType: "PermitBatch",
  domain,
  message: {
    details: [
      permitSingle.details,
      { ...permitSingle.details, token: C, amount: 10n },
    ],
    spender: B,
    sigDeadline: NOW,
  },
});
await typed("05-transfer", {
  primaryType: "PermitTransferFrom",
  domain,
  message: {
    permitted: { token: A, amount: 20n },
    spender: B,
    to: C,
    deadline: NOW,
  },
});
await typed("06-transfer-batch", {
  primaryType: "PermitBatchTransferFrom",
  domain,
  message: {
    permitted: [
      { token: A, amount: 20n },
      { token: C, amount: 30n },
    ],
    spender: B,
    deadline: NOW,
  },
});
const order = {
  offer: [{ itemType: 2, token: A, identifierOrCriteria: 1n, startAmount: 1n }],
  consideration: [{ itemType: 0, token: A, startAmount: 0n }],
  endTime: NOW,
};
await typed("07-seaport-zero", {
  primaryType: "OrderComponents",
  domain,
  message: order,
});
await typed("08-seaport-paid", {
  primaryType: "OrderComponents",
  domain,
  message: {
    ...order,
    consideration: [{ itemType: 0, token: A, startAmount: 10n ** 18n }],
  },
});
await typed("09-unknown", { primaryType: "Mystery", domain, message: {} });

const siwe = `example.com wants you to sign in with your Ethereum account:\n${A}\n\nSign in\n\nURI: https://example.com\nVersion: 1\nChain ID: 11155111\nNonce: 12345678\nIssued At: 2027-01-15T00:00:00.000Z\nExpiration Time: 2027-01-16T00:00:00.000Z`;
const siweHex = `0x${Buffer.from(siwe).toString("hex")}`;
await message("01-siwe", [siwe, A], "personal_sign");
await message("02-siwe-hex", [A, siweHex], "personal_sign");
await message("03-hash", [`0x${"ff".repeat(32)}`, A], "personal_sign");
await message("04-plain", ["Hello PlainSign", A], "personal_sign");
await message("05-eth-sign", [A, `0x${"11".repeat(32)}`], "eth_sign");

console.log("Generated 26 transaction, 9 typed-data, and 5 message fixtures.");
