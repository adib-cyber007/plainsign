import type { Address } from "viem";

import type { Intent, InterceptedMethod } from "../types";
import { isUnlimitedAmount } from "./tx";

type TypedDataMethod = Extract<
  InterceptedMethod,
  "eth_signTypedData_v3" | "eth_signTypedData_v4"
>;

interface TypedDataEnvelope extends Record<string, unknown> {
  primaryType?: string;
  domain?: unknown;
  message?: unknown;
}

export function decodeTypedData(
  input: unknown,
  method: TypedDataMethod,
): Intent {
  try {
    const data = extractTypedData(input);
    if (!data) {
      return unknownTypedData(
        input,
        method,
        "Typed data payload was not found.",
      );
    }

    const primaryType =
      typeof data.primaryType === "string" ? data.primaryType : "unknown";
    const message = asRecordOrEmpty(data.message);
    const domain = normalizeDomain(data.domain);
    const base = { method, primaryType, domain, raw: input };

    if (primaryType === "Permit") {
      const amount = asBigInt(message.value ?? message.amount);
      return {
        ...base,
        kind: "permit_erc2612",
        token: domain?.verifyingContract,
        spender: asOptionalAddress(message.spender),
        amount,
        deadline: asOptionalNumber(message.deadline),
        isUnlimited: isUnlimitedAmount(amount),
      };
    }

    if (primaryType === "PermitSingle") {
      const details = asRecord(message.details);
      const amount = asBigInt(details.amount);
      return {
        ...base,
        kind: "permit2_single",
        token: asOptionalAddress(details.token),
        spender: asOptionalAddress(message.spender),
        amount,
        deadline:
          asOptionalNumber(details.expiration) ??
          asOptionalNumber(message.sigDeadline),
        isUnlimited: isUnlimitedAmount(amount, 160),
      };
    }

    if (primaryType === "PermitBatch") {
      const details = Array.isArray(message.details) ? message.details : [];
      const spender = asOptionalAddress(message.spender);
      const deadline = asOptionalNumber(message.sigDeadline);
      const children = details.map((detail) => {
        const item = asRecord(detail);
        const amount = asBigInt(item.amount);
        return {
          kind: "permit2_single" as const,
          method,
          token: asOptionalAddress(item.token),
          spender,
          amount,
          deadline: asOptionalNumber(item.expiration) ?? deadline,
          isUnlimited: isUnlimitedAmount(amount, 160),
          primaryType: "PermitSingle",
          domain,
          raw: detail,
        };
      });
      return {
        ...base,
        kind: "permit2_batch",
        spender,
        deadline,
        isUnlimited: children.some((child) => child.isUnlimited),
        children,
      };
    }

    if (
      primaryType === "PermitTransferFrom" ||
      primaryType === "PermitBatchTransferFrom"
    ) {
      return decodePermitTransfer(message, primaryType, domain, method, input);
    }

    if (primaryType === "OrderComponents") {
      return decodeSeaportOrder(message, domain, method, input);
    }

    return { ...base, kind: "unknown_typed_data" };
  } catch (error) {
    return unknownTypedData(input, method, errorMessage(error));
  }
}

function decodePermitTransfer(
  message: Record<string, unknown>,
  primaryType: "PermitTransferFrom" | "PermitBatchTransferFrom",
  domain: Intent["domain"],
  method: TypedDataMethod,
  raw: unknown,
): Intent {
  const permitted = message.permitted;
  const spender = asOptionalAddress(message.spender);
  const deadline = asOptionalNumber(message.deadline);
  if (Array.isArray(permitted)) {
    const children = permitted.map((permission) => {
      const item = asRecord(permission);
      const amount = asBigInt(item.amount);
      return {
        kind: "permit2_transferFrom" as const,
        method,
        token: asOptionalAddress(item.token),
        spender,
        amount,
        deadline,
        isUnlimited: isUnlimitedAmount(amount, 160),
        primaryType: "PermitTransferFrom",
        domain,
        raw: permission,
      };
    });
    return {
      kind: "permit2_transferFrom",
      method,
      spender,
      deadline,
      isUnlimited: children.some((child) => child.isUnlimited),
      primaryType,
      domain,
      children,
      raw,
    };
  }

  const item = asRecord(permitted);
  const amount = asBigInt(item.amount);
  return {
    kind: "permit2_transferFrom",
    method,
    token: asOptionalAddress(item.token),
    spender,
    recipient: asOptionalAddress(message.to ?? message.recipient),
    amount,
    deadline,
    isUnlimited: isUnlimitedAmount(amount, 160),
    primaryType,
    domain,
    raw,
  };
}

function decodeSeaportOrder(
  message: Record<string, unknown>,
  domain: Intent["domain"],
  method: TypedDataMethod,
  raw: unknown,
): Intent {
  const offer = Array.isArray(message.offer) ? message.offer : [];
  const consideration = Array.isArray(message.consideration)
    ? message.consideration
    : [];
  const nftOffer = offer.filter((item) => {
    const itemType = asOptionalNumber(asRecordOrEmpty(item).itemType);
    return itemType === 2 || itemType === 3;
  });
  const totalConsideration = consideration.reduce((total, item) => {
    const record = asRecordOrEmpty(item);
    return total + asBigIntOrZero(record.startAmount ?? record.amount);
  }, 0n);

  return {
    kind: "seaport_order",
    method,
    token: asOptionalAddress(asRecordOrEmpty(nftOffer[0]).token),
    tokenIds: nftOffer.map((item) =>
      asBigInt(asRecord(item).identifierOrCriteria ?? 0n),
    ),
    deadline: asOptionalNumber(message.endTime),
    primaryType: "OrderComponents",
    domain,
    considerationNearZero:
      nftOffer.length > 0 && totalConsideration < 1_000_000_000_000n,
    raw,
  };
}

function extractTypedData(input: unknown): TypedDataEnvelope | undefined {
  const candidates = Array.isArray(input) ? input : [input];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (isTypedDataEnvelope(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    } else if (isTypedDataEnvelope(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function isTypedDataEnvelope(value: unknown): value is TypedDataEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    ("primaryType" in value || "domain" in value || "message" in value)
  );
}

function normalizeDomain(value: unknown): Intent["domain"] {
  const domain = asRecordOrEmpty(value);
  const name = typeof domain.name === "string" ? domain.name : undefined;
  const verifyingContract = asOptionalAddress(domain.verifyingContract);
  const chainId = asOptionalNumber(domain.chainId);
  return name !== undefined ||
    verifyingContract !== undefined ||
    chainId !== undefined
    ? { name, verifyingContract, chainId }
    : undefined;
}

function unknownTypedData(
  raw: unknown,
  method: TypedDataMethod,
  decodeError?: string,
): Intent {
  const data = extractTypedData(raw);
  return {
    kind: "unknown_typed_data",
    method,
    primaryType:
      typeof data?.primaryType === "string" ? data.primaryType : undefined,
    domain: normalizeDomain(data?.domain),
    raw,
    decodeError,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Expected an object in typed data.");
  }
  return value as Record<string, unknown>;
}

function asRecordOrEmpty(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asBigInt(value: unknown): bigint {
  if (
    typeof value !== "bigint" &&
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new TypeError("Expected an integer in typed data.");
  }
  return BigInt(value);
}

function asBigIntOrZero(value: unknown): bigint {
  try {
    return value === undefined ? 0n : asBigInt(value);
  } catch {
    return 0n;
  }
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(asBigInt(value));
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function asOptionalAddress(value: unknown): Address | undefined {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value)
    ? (value as Address)
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
