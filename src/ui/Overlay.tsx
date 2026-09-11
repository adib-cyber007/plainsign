import { useEffect, useRef } from "react";

import type { AnalysisResult, UserDecision } from "../types";
import { VerdictCard } from "./VerdictCard";

export interface OverlayProps {
  result?: AnalysisResult;
  showTechnicalByDefault?: boolean;
  canRevoke?: boolean;
  onDecision: (decision: UserDecision) => void;
}

export function Overlay({
  result,
  showTechnicalByDefault = false,
  canRevoke = false,
  onDecision,
}: OverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDecision("reject");
      } else if (event.key === "Enter" && result?.risk.verdict === "safe") {
        event.preventDefault();
        onDecision("continue");
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onDecision, result]);

  return (
    <div
      className="ps-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDecision("reject");
      }}
    >
      <div
        className="ps-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={
          result
            ? `PlainSign ${result.risk.verdict} verdict`
            : "PlainSign analyzing request"
        }
        ref={dialogRef}
        tabIndex={-1}
      >
        {result ? (
          <VerdictCard
            key={`${result.id}:${showTechnicalByDefault ? "technical" : "beginner"}`}
            result={result}
            showTechnicalByDefault={showTechnicalByDefault}
            canRevoke={canRevoke}
            onContinue={() => onDecision("continue")}
            onReject={() => onDecision("reject")}
            onRevoke={() => onDecision("revoke")}
          />
        ) : (
          <div className="ps-card ps-analyzing" aria-live="assertive">
            <div className="ps-scan" aria-hidden="true">
              <span />
            </div>
            <h1>Analyzing…</h1>
            <p>Reading what this wallet request can do.</p>
            <div className="ps-progress" aria-hidden="true">
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
