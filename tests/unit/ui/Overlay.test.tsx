// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Overlay } from "../../../src/ui/Overlay";
import type { AnalysisResult, Verdict } from "../../../src/types";

afterEach(cleanup);

function result(verdict: Verdict): AnalysisResult {
  return {
    id: verdict,
    intent: { kind: "native_transfer", method: "eth_sendTransaction", raw: {} },
    simulation: {
      ok: true,
      provider: "none",
      changes: [{ kind: "native", delta: -1n, formatted: "-0.01 ETH" }],
    },
    risk: {
      score: verdict === "safe" ? 0 : verdict === "caution" ? 25 : 80,
      verdict,
      reasons: [
        {
          id: "test",
          weight: 25,
          severity: "warn",
          title: "Test reason",
          detail: "Test detail",
        },
      ],
    },
    explanation: {
      summary: `${verdict} summary.`,
      beginner: ["Beginner detail"],
      technical: ["Method: eth_sendTransaction"],
      source: "template",
    },
    durationMs: 1,
    timings: { decodedMs: 12, enrichedMs: 640, rulesMs: 1 },
  };
}

describe("Overlay", () => {
  it("renders the analyzing state", () => {
    render(<Overlay onDecision={vi.fn()} />);
    expect(screen.getByText("Analyzing…")).toBeInTheDocument();
  });

  for (const verdict of ["safe", "caution", "danger"] as const) {
    it(`renders the ${verdict} result state`, () => {
      render(<Overlay result={result(verdict)} onDecision={vi.fn()} />);
      expect(
        screen.getByRole("heading", {
          name:
            verdict === "safe"
              ? "Safe"
              : verdict === "caution"
                ? "Caution"
                : "Danger",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(`${verdict} summary.`)).toBeInTheDocument();
      expect(screen.getByText("-0.01 ETH")).toBeInTheDocument();
    });
  }

  it("fires button callbacks and switches detail views", () => {
    const decide = vi.fn();
    render(<Overlay result={result("danger")} onDecision={decide} />);
    expect(screen.getByText("Beginner detail")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Technical" }));
    expect(screen.getByText("Method: eth_sendTransaction")).toBeInTheDocument();
    expect(
      screen.getByText("decoded 12 ms · enriched 640 ms · rules 1 ms"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to wallet" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(decide).toHaveBeenNthCalledWith(1, "continue");
    expect(decide).toHaveBeenNthCalledWith(2, "reject");
  });

  it("maps Escape to reject and Enter to continue only for safe verdicts", () => {
    const decide = vi.fn();
    const view = render(
      <Overlay result={result("safe")} onDecision={decide} />,
    );
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(decide).toHaveBeenNthCalledWith(1, "continue");
    expect(decide).toHaveBeenNthCalledWith(2, "reject");
    view.unmount();

    const dangerDecision = vi.fn();
    render(<Overlay result={result("danger")} onDecision={dangerDecision} />);
    fireEvent.keyDown(window, { key: "Enter" });
    expect(dangerDecision).not.toHaveBeenCalled();
  });

  it("rejects when the backdrop itself is clicked", () => {
    const decide = vi.fn();
    const { container } = render(
      <Overlay result={result("caution")} onDecision={decide} />,
    );
    fireEvent.mouseDown(container.querySelector(".ps-backdrop")!);
    expect(decide).toHaveBeenCalledWith("reject");
  });
});
