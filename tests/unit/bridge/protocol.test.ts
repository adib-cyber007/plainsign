import { describe, expect, it } from "vitest";
import { deserialize, serialize } from "../../../src/bridge/protocol";

describe("bridge protocol", () => {
  it("round-trips deep bigint values", () => {
    const value = { amount: 123n, nested: [0n, { delta: -45n }] };
    expect(deserialize(serialize(value))).toEqual(value);
    expect(serialize(value)).toEqual({ amount: { __bigint: "123" }, nested: [{ __bigint: "0" }, { delta: { __bigint: "-45" } }] });
  });
});
