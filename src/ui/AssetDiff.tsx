import type { AssetChange } from "../types";

export interface AssetDiffProps {
  changes: AssetChange[];
}

export function AssetDiff({ changes }: AssetDiffProps) {
  if (changes.length === 0) return null;

  return (
    <section className="ps-section" aria-labelledby="ps-changes-title">
      <h2 id="ps-changes-title" className="ps-section-title">
        Expected wallet changes
      </h2>
      <ul className="ps-change-list">
        {changes.map((change, index) => {
          const outgoing = change.delta < 0n;
          return (
            <li
              className="ps-change"
              key={`${change.kind}-${change.token ?? "native"}-${index}`}
            >
              <span
                className={`ps-change-mark ${outgoing ? "ps-out" : "ps-in"}`}
                aria-hidden="true"
              >
                {outgoing ? "−" : "+"}
              </span>
              <span>{change.formatted}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
