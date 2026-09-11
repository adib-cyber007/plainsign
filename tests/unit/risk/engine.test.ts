import { describe, expect, it } from "vitest";

import { evaluate, verdictFromScore } from "../../../src/risk/engine";
import { TARGET, riskContext } from "../helpers/riskContext";

describe("risk engine", () => {
  it.each([
    [24, "safe"],
    [25, "caution"],
    [59, "caution"],
    [60, "danger"],
  ] as const)("maps %i to %s", (score, verdict) => {
    expect(verdictFromScore(score)).toBe(verdict);
  });

  it("instant danger beats a negative weight", () => {
    const result = evaluate(
      riskContext(
        { kind: "seaport_order", considerationNearZero: true },
        { info: { allowlisted: { protocol: "Market", domains: ["*"] } } },
      ),
    );
    expect(result).toMatchObject({
      verdict: "danger",
      instantVerdict: "danger",
      score: 0,
    });
  });

  it("makes a community-listed drainer instant danger", () => {
    const result = evaluate(
      riskContext(
        {},
        {
          info: {
            denylisted: {
              label: "Reported drainer",
              source: "Community report #1",
            },
          },
        },
      ),
    );
    expect(result).toMatchObject({
      verdict: "danger",
      instantVerdict: "danger",
      score: 0,
    });
    expect(result.reasons.map((reason) => reason.id)).toContain(
      "known_drainer",
    );
  });

  it("treats an opaque personal_sign hash as instant danger", () => {
    const result = evaluate(
      riskContext({ kind: "raw_hash", method: "personal_sign" }),
    );
    expect(result).toMatchObject({
      verdict: "danger",
      instantVerdict: "danger",
      score: 45,
    });
    expect(result.reasons.map((reason) => reason.id)).toContain(
      "personal_sign_hash",
    );
  });

  it("forceMin raises a zero score", () => {
    expect(evaluate(riskContext({}, { reverted: true })).verdict).toBe(
      "caution",
    );
  });

  it("defaults unknown requests to caution", () => {
    const result = evaluate(riskContext({ kind: "unknown_function" }));
    expect(result.score).toBe(20);
    expect(result.verdict).toBe("caution");
    expect(result.reasons.map((reason) => reason.id)).toContain(
      "unknown_function",
    );
  });

  it("critical post-rule raises a below-threshold score", () => {
    const result = evaluate(
      riskContext(
        { kind: "permit2_transferFrom", to: TARGET },
        { info: { allowlisted: { protocol: "Known", domains: ["*"] } } },
      ),
    );
    expect(result.score).toBe(20);
    expect(result.verdict).toBe("caution");
  });

  it("clamps scores and sorts reasons", () => {
    const result = evaluate(
      riskContext(
        { kind: "erc20_approve", spender: TARGET, isUnlimited: true },
        {
          info: { isContract: false, isVerified: false, ageDays: 1 },
          changes: [{ kind: "erc20", delta: -1n, formatted: "-1" }],
        },
      ),
    );
    expect(result.score).toBe(100);
    expect(result.reasons.map((reason) => reason.severity)).toEqual([
      "critical",
      "critical",
      "critical",
      "warn",
    ]);
    expect(result.reasons.slice(0, 3).map((reason) => reason.weight)).toEqual([
      50, 40, 0,
    ]);
  });
});
