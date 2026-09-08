const BIGINT_KEY = "__bigint";

export interface SerializedBigInt {
  __bigint: string;
}

export function serialize(value: unknown): unknown {
  return transform(value, "serialize", new WeakSet<object>());
}

export function deserialize(value: unknown): unknown {
  return transform(value, "deserialize", new WeakSet<object>());
}

function transform(
  value: unknown,
  direction: "serialize" | "deserialize",
  ancestors: WeakSet<object>,
): unknown {
  if (direction === "serialize" && typeof value === "bigint") {
    return { [BIGINT_KEY]: value.toString() } satisfies SerializedBigInt;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (direction === "deserialize" && isSerializedBigInt(value)) {
    return BigInt(value[BIGINT_KEY]);
  }

  if (ancestors.has(value)) {
    throw new TypeError("PlainSign bridge values cannot contain circular references.");
  }

  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.map((item) => transform(item, direction, ancestors))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          transform(item, direction, ancestors),
        ]),
      );
  ancestors.delete(value);
  return result;
}

function isSerializedBigInt(value: object): value is SerializedBigInt {
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === 1 &&
    typeof record[BIGINT_KEY] === "string" &&
    /^-?\d+$/.test(record[BIGINT_KEY])
  );
}
