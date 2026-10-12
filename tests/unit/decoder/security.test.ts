import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Hex } from "viem";

import { CHAINS } from "../../../src/config/chains";
import { decodeMessage } from "../../../src/decoder/message";
import { decodeTransaction } from "../../../src/decoder/tx";
import { wethAbi } from "../../../src/decoder/abis/weth";
import { evaluate } from "../../../src/risk/engine";
import { riskContext, TARGET } from "../helpers/riskContext";

const deposit = encodeFunctionData({ abi: wethAbi, functionName: "deposit" });
const withdraw = encodeFunctionData({ abi: wethAbi, functionName: "withdraw", args: [1n] });

describe("contract identity before a reassuring WETH explanation", () => {
  it.each(Object.values(CHAINS))("recognizes registered WETH on $name", (chain) => {
    expect(decodeTransaction({ to: chain.wethAddress, data: deposit, value: 1n }, chain.id).kind).toBe("weth_wrap");
    expect(decodeTransaction({ to: chain.wethAddress, data: withdraw }, chain.id).kind).toBe("weth_unwrap");
  });

  it.each([
    ["lookalike deposit", TARGET, deposit, 1],
    ["lookalike withdrawal", TARGET, withdraw, 1],
    ["WETH from another network", CHAINS[11155111].wethAddress, deposit, 1],
    ["unsupported network", CHAINS[1].wethAddress, deposit, 999999],
  ] as const)("gives %s an unknown-action Caution floor", (_name, to, data, chainId) => {
    const intent = decodeTransaction({ to, data, value: 1n }, chainId);
    expect(intent.kind).toBe("unknown_function");
    expect(evaluate(riskContext(intent)).verdict).toBe("caution");
  });

  it("does not hide short calldata behind a native-transfer explanation", () => {
    const intent = decodeTransaction({ to: TARGET, data: "0x1234", value: 1n }, 1);
    expect(intent.kind).toBe("unknown_function");
    expect(evaluate(riskContext(intent)).verdict).toBe("caution");
  });
});

describe("hash signing", () => {
  it.each(["00", "61", "ff"])("warns about 32-byte hex filled with %s even if it decodes as text", (byte) => {
    const intent = decodeMessage([`0x${byte.repeat(32)}` as Hex, TARGET], "personal_sign");
    expect(intent.kind).toBe("raw_hash");
    expect(evaluate(riskContext(intent)).verdict).toBe("danger");
  });

  it("still explains a normal hex-encoded readable message", () => {
    expect(decodeMessage(["0x48656c6c6f", TARGET], "personal_sign").kind).toBe("plain_message");
  });
});
