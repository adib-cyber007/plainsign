import { describe, expect, it } from "vitest";

import * as signals from "../../../src/risk/signals";
import { TARGET, riskContext } from "../helpers/riskContext";

const cases = [
  ["isEthSign", { kind: "raw_hash", method: "eth_sign" }, {}],
  ["isPersonalSignHexHash", { kind: "raw_hash", method: "personal_sign" }, {}],
  [
    "isSpenderEOA",
    { kind: "erc20_approve", spender: TARGET },
    { info: { isContract: false } },
  ],
  [
    "isUnlimitedApprovalToUnknown",
    { kind: "erc20_approve", spender: TARGET, isUnlimited: true },
    {},
  ],
  [
    "isSetApprovalForAllToUnknown",
    { kind: "erc721_setApprovalForAll", operator: TARGET, approved: true },
    {},
  ],
  [
    "isPermitLongOrUnlimited",
    { kind: "permit2_single", deadline: 1_800_000_000 + 31 * 86_400 },
    {},
  ],
  ["isPermit2TransferFrom", { kind: "permit2_transferFrom" }, {}],
  [
    "isMarketplaceOrderNearZero",
    { kind: "seaport_order", considerationNearZero: true },
    {},
  ],
  [
    "isKnownDrainer",
    { to: TARGET },
    {
      info: {
        denylisted: {
          label: "Reported drainer",
          source: "Community report #1",
        },
      },
    },
  ],
  ["isTargetYoungerThanDays", { to: TARGET }, { info: { ageDays: 6 } }, "7"],
  ["isTargetUnverified", { to: TARGET }, { info: { isVerified: false } }],
  [
    "isDomainMismatch",
    { to: TARGET },
    { info: { allowlisted: { protocol: "Test", domains: ["official.test"] } } },
  ],
  [
    "isNetOutflowNoInflow",
    {},
    { changes: [{ kind: "erc20", delta: -1n, formatted: "-1" }] },
  ],
  ["didSimulationRevert", {}, { reverted: true }],
  ["isUnknownFunction", { kind: "unknown_function" }, {}],
  [
    "isTargetAllowlistedAndDomainOk",
    { to: TARGET },
    {
      origin: "https://app.official.test",
      info: { allowlisted: { protocol: "Test", domains: ["official.test"] } },
    },
  ],
] as const;

describe("risk signals", () => {
  for (const [name, intent, options, argument] of cases) {
    it(`${name} fires and does not fire`, () => {
      const signal = signals.signalRegistry[name];
      expect(
        signal(riskContext(intent as never, options as never), argument),
      ).toBe(true);
      expect(signal(riskContext(), argument)).toBe(false);
    });
  }

  it("recurses through multicall children", () => {
    const context = riskContext({
      kind: "multicall",
      children: [
        { kind: "unknown_function", method: "eth_sendTransaction", raw: {} },
      ],
    });
    expect(signals.isUnknownFunction(context)).toBe(true);
  });

  it("wildcard allowlists match any valid origin", () => {
    const context = riskContext(
      {},
      { info: { allowlisted: { protocol: "Test", domains: ["*"] } } },
    );
    expect(signals.isTargetAllowlistedAndDomainOk(context)).toBe(true);
  });
});
