import { hexToBytes, type Address, type Hex } from "viem";

import type { Intent, InterceptedMethod } from "../types";

type MessageMethod = Extract<InterceptedMethod, "personal_sign" | "eth_sign">;

export interface SiweFields {
  domain: string;
  address?: Address;
  uri?: string;
  chainId?: number;
  expiration?: string;
  expirationTime?: number;
}

export function decodeMessage(input: unknown, method: MessageMethod): Intent {
  try {
    const encoded = extractMessage(input, method);
    if (method === "eth_sign") {
      return {
        kind: "raw_hash",
        method,
        functionName: "eth_sign",
        raw: input,
      };
    }

    const decoded = decodePossibleHex(encoded);
    const siwe = decoded.text ? parseSiweMessage(decoded.text) : undefined;
    if (siwe) {
      return {
        kind: "siwe",
        method,
        domain: { name: siwe.domain, chainId: siwe.chainId },
        deadline: siwe.expirationTime,
        functionName: "personal_sign",
        raw: { input, message: decoded.text, siwe },
      };
    }

    if (decoded.isThirtyTwoByteHex && decoded.text === undefined) {
      return {
        kind: "raw_hash",
        method,
        functionName: "personal_sign",
        raw: input,
      };
    }

    return {
      kind: "plain_message",
      method,
      functionName: "personal_sign",
      raw: decoded.text ?? encoded,
    };
  } catch (error) {
    return {
      kind: method === "eth_sign" ? "raw_hash" : "plain_message",
      method,
      functionName: method,
      raw: input,
      decodeError: errorMessage(error),
    };
  }
}

export function parseSiweMessage(message: string): SiweFields | undefined {
  const header = message.match(
    /^([^\r\n]+) wants you to sign in with your Ethereum account:\r?\n(0x[0-9a-fA-F]{40})/,
  );
  if (!header) {
    return undefined;
  }

  const uri = field(message, "URI");
  const chainIdText = field(message, "Chain ID");
  const expiration = field(message, "Expiration Time");
  const chainId = chainIdText === undefined ? undefined : Number(chainIdText);
  const expirationMs =
    expiration === undefined ? Number.NaN : Date.parse(expiration);

  return {
    domain: header[1],
    address: header[2] as Address,
    uri,
    chainId: Number.isSafeInteger(chainId) ? chainId : undefined,
    expiration,
    expirationTime: Number.isFinite(expirationMs)
      ? Math.floor(expirationMs / 1_000)
      : undefined,
  };
}

function field(message: string, label: string): string | undefined {
  const pattern = new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, "m");
  return message.match(pattern)?.[1]?.trim();
}

function extractMessage(input: unknown, method: MessageMethod): string {
  if (typeof input === "string") return input;
  if (!Array.isArray(input)) {
    throw new TypeError("Signing message was not a string or parameter array.");
  }

  const strings = input.filter(
    (value): value is string => typeof value === "string",
  );
  if (method === "eth_sign") {
    return strings.find((value) => !isAddress(value)) ?? strings.at(-1) ?? "";
  }
  return strings.find((value) => !isAddress(value)) ?? strings[0] ?? "";
}

function decodePossibleHex(value: string): {
  text?: string;
  isThirtyTwoByteHex: boolean;
} {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) {
    return { text: value, isThirtyTwoByteHex: false };
  }

  const isThirtyTwoByteHex = value.length === 66;
  try {
    const bytes = hexToBytes(value as Hex);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { text, isThirtyTwoByteHex };
  } catch {
    return { isThirtyTwoByteHex };
  }
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
