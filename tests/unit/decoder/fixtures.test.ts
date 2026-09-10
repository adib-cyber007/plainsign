import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { deserialize } from "../../../src/bridge/protocol";
import { decode } from "../../../src/decoder";
import { decodeMessage, parseSiweMessage } from "../../../src/decoder/message";
import {
  decodeTransaction,
  type TransactionLike,
} from "../../../src/decoder/tx";
import { decodeTypedData } from "../../../src/decoder/typedData";
import type {
  AnalysisRequest,
  Intent,
  InterceptedMethod,
} from "../../../src/types";

interface Fixture<T> {
  input: T;
  expected: Omit<Intent, "raw">;
}

function load<T>(folder: string, file: string): Fixture<T> {
  return deserialize(
    JSON.parse(
      readFileSync(resolve("tests", "fixtures", folder, file), "utf8"),
    ),
  ) as Fixture<T>;
}

function stripRaw(intent: Intent): Omit<Intent, "raw"> {
  const copy = { ...intent } as Partial<Intent>;
  delete copy.raw;
  if (intent.children)
    copy.children = intent.children.map(stripRaw) as Intent[];
  return copy as Omit<Intent, "raw">;
}

describe("transaction fixtures", async () => {
  const files = await readdir(resolve("tests", "fixtures", "tx"));
  for (const file of files) {
    it(file, () => {
      const fixture = load<TransactionLike>("tx", file);
      expect(
        stripRaw(decodeTransaction(fixture.input, 11155111)),
      ).toMatchObject(fixture.expected);
    });
  }
});

describe("typed-data fixtures", async () => {
  const files = await readdir(resolve("tests", "fixtures", "typed"));
  for (const file of files) {
    it(file, () => {
      const fixture = load<unknown>("typed", file);
      expect(
        stripRaw(decodeTypedData(fixture.input, "eth_signTypedData_v4")),
      ).toMatchObject(fixture.expected);
    });
  }
});

describe("message fixtures", async () => {
  const files = await readdir(resolve("tests", "fixtures", "msg"));
  for (const file of files) {
    it(file, () => {
      const fixture = load<unknown>("msg", file) as Fixture<unknown> & {
        method: InterceptedMethod;
      };
      const method = fixture.method as "personal_sign" | "eth_sign";
      expect(stripRaw(decodeMessage(fixture.input, method))).toMatchObject(
        fixture.expected,
      );
    });
  }
});

it("extracts SIWE fields", () => {
  const message =
    "example.com wants you to sign in with your Ethereum account:\n0x1111111111111111111111111111111111111111\n\nURI: https://example.com\nChain ID: 1\nExpiration Time: 2030-01-01T00:00:00Z";
  expect(parseSiweMessage(message)).toMatchObject({
    domain: "example.com",
    uri: "https://example.com",
    chainId: 1,
  });
  expect(parseSiweMessage("hello")).toBeUndefined();
});

it("the top-level decoder routes every method and never throws", async () => {
  const base = {
    id: "1",
    origin: "https://example.com",
    chainId: 1,
    from: "0x1111111111111111111111111111111111111111",
  } as const;
  const requests = [
    {
      method: "eth_sendTransaction",
      params: [{ to: base.from, data: "0xdeadbeef" }],
    },
    { method: "eth_signTypedData_v3", params: [base.from, "not-json"] },
    { method: "personal_sign", params: [42] },
    { method: "eth_sign", params: [base.from, "0x12"] },
  ] as AnalysisRequest["request"][];
  for (const request of requests) {
    await expect(decode({ ...base, request })).resolves.toHaveProperty("kind");
  }
});

it.each([
  ["eth_sendTransaction", "unknown_function"],
  ["eth_signTypedData_v4", "unknown_typed_data"],
  ["eth_signTypedData_v3", "unknown_typed_data"],
  ["personal_sign", "plain_message"],
  ["eth_sign", "raw_hash"],
] as const)("contains unexpected %s failures as %s", async (method, kind) => {
  let reads = 0;
  const request = {
    method,
    get params(): unknown[] {
      reads += 1;
      if (reads === 1) {
        if (method === "eth_sign") throw "boom";
        throw new Error("boom");
      }
      return [];
    },
  } as AnalysisRequest["request"];
  const result = await decode({
    id: "fallback",
    origin: "https://example.com",
    chainId: 1,
    from: "0x1111111111111111111111111111111111111111",
    request,
  });
  expect(result).toMatchObject({ kind, decodeError: "boom" });
});

it("returns safe fallbacks for malformed low-level inputs", () => {
  expect(
    decodeTransaction(
      { to: "0x1111111111111111111111111111111111111111", data: "0x095ea7b3" },
      1,
    ),
  ).toMatchObject({ kind: "unknown_function" });
  expect(
    decodeTypedData(
      { primaryType: "Permit", message: {} },
      "eth_signTypedData_v4",
    ),
  ).toMatchObject({ kind: "unknown_typed_data" });
  expect(decodeMessage([42], "personal_sign")).toMatchObject({
    kind: "plain_message",
  });
});
