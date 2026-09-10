import type { RiskReason } from "../types";

export interface ReasonsProps {
  reasons: RiskReason[];
}

export function Reasons({ reasons }: ReasonsProps) {
  return (
    <details
      className="ps-reasons"
      open={reasons.some((reason) => reason.severity === "critical")}
    >
      <summary>
        Why?
        <span className="ps-reason-count">{reasons.length}</span>
      </summary>
      {reasons.length === 0 ? (
        <p className="ps-muted">No risk rules were triggered.</p>
      ) : (
        <ul className="ps-reason-list">
          {reasons.map((reason) => (
            <li key={reason.id}>
              <span
                className={`ps-reason-dot ps-${reason.severity}`}
                aria-hidden="true"
              />
              <div>
                <strong>{reason.title}</strong>
                <p>{reason.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
