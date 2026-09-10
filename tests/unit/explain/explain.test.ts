import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { deserialize } from "../../../src/bridge/protocol";
import { explain } from "../../../src/explain";
import { templates } from "../../../src/explain/templates";
import type {
  AddressInfo,
  Intent,
  RiskResult,
  SimulationResult,
} from "../../../src/types";

const simulation: SimulationResult = {
  ok: true,
  changes: [],
  provider: "none",
};
const risk: RiskResult = { score: 0, verdict: "safe", reasons: [] };

async function fixtureIntents(): Promise<
  Array<{ name: string; intent: Intent }>
> {
  const result: Array<{ name: string; intent: Intent }> = [];
  for (const folder of ["tx", "typed", "msg"]) {
    for (const file of await readdir(resolve("tests", "fixtures", folder))) {
      const fixture = deserialize(
        JSON.parse(
          readFileSync(resolve("tests", "fixtures", folder, file), "utf8"),
        ),
      ) as { expected: Intent };
      result.push({
        name: `${folder}/${file}`,
        intent: { ...fixture.expected, raw: {} },
      });
    }
  }
  return result;
}

describe("explanation templates", async () => {
  const fixtures = await fixtureIntents();

  it("has exactly one template for every produced intent kind", () => {
    const kinds = new Set(fixtures.map(({ intent }) => intent.kind));
    expect(Object.keys(templates).sort()).toEqual([...kinds].sort());
  });

  for (const { name, intent } of fixtures) {
    it(`snapshots ${name}`, () => {
      const output = explain(
        intent,
        simulation,
        risk,
        {},
        { chainId: 11155111, now: 1_800_000_000 },
      );
      expect(output.summary).toMatchSnapshot();
    });
  }

  it("never uses banned technical words in beginner-facing copy", () => {
    const banned =
      /\b(?:approve|spender|operator|calldata|allowance|EOA|msg\.sender)\b/i;
    for (const { intent } of fixtures) {
      const output = explain(
        intent,
        simulation,
        risk,
        {},
        { now: 1_800_000_000 },
      );
      expect([output.summary, ...output.beginner].join(" ")).not.toMatch(
        banned,
      );
      expect(output.summary.trim()).toMatch(/[.!?]$/);
    }
  });

  it("names known, personal, and young counterparties and formats token amounts", () => {
    const address = "0x2222222222222222222222222222222222222222";
    const addresses: Record<string, AddressInfo> = {
      [address]: {
        address,
        isContract: false,
        contractName: "Helper",
        ageDays: 2,
        fetchedAt: 0,
      },
    };
    const output = explain(
      {
        kind: "erc20_approve",
        method: "eth_sendTransaction",
        spender: address,
        token: address,
        amount: 1_500_000n,
        deadline: 1_800_000_001,
        raw: {},
      },
      {
        ok: true,
        provider: "none",
        changes: [
          {
            kind: "erc20",
            token: address,
            symbol: "USDC",
            decimals: 6,
            delta: -1_500_000n,
            formatted: "-1.5 USDC",
          },
        ],
      },
      {
        score: 25,
        verdict: "caution",
        reasons: [
          {
            id: "x",
            weight: 25,
            severity: "warn",
            title: "x",
            detail: "Risk detail",
          },
        ],
      },
      addresses,
      { chainId: 1, now: 1_800_000_000, degraded: true },
    );
    expect(output.summary).toContain(
      "Helper — a personal wallet, not an app (created 2 days ago)",
    );
    expect(output.summary).toContain("1.5 USDC");
    expect(output.beginner).toContain("Simulation shows you lose -1.5 USDC.");
    expect(output.beginner.at(-1)).toContain("could not fully analyze");
    expect(output.technical).toContain("Raw amount: 1500000");
    expect(output.whatCouldGoWrong).toBe("Risk detail");
  });

  it("describes failed simulation and long or expired deadlines", () => {
    const base: Intent = {
      kind: "swap",
      method: "eth_sendTransaction",
      deadline: 1,
      functionSig: "0x12345678",
      raw: {},
    };
    const failed = explain(
      base,
      {
        ok: false,
        reverted: true,
        revertReason: "No route",
        changes: [],
        provider: "none",
      },
      risk,
      {},
      { now: 2 },
    );
    expect(failed.beginner.join(" ")).toContain("No route");
    expect(failed.summary).toContain("expired");
    expect(
      explain(
        { ...base, deadline: 2 + 366 * 86_400 },
        simulation,
        risk,
        {},
        { now: 2 },
      ).summary,
    ).toContain("no practical expiry");
  });
});
