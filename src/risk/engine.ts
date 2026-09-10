import type { RiskContext, RiskReason, RiskResult, Verdict } from "../types";
import configJson from "./rules.json";
import { signalRegistry } from "./signals";

interface Rule {
  id: string;
  signal: string;
  weight?: number;
  instant?: Verdict;
  forceMin?: Verdict;
  severity: RiskReason["severity"];
  title: string;
  detail: string;
}

interface RulesConfig {
  thresholds: { danger: number; caution: number };
  postRules: { anyCriticalMinVerdict: Verdict };
  rules: Rule[];
}

const config = configJson as RulesConfig;
const rank: Record<Verdict, number> = { safe: 0, caution: 1, danger: 2 };
const severityRank: Record<RiskReason["severity"], number> = {
  info: 0,
  warn: 1,
  critical: 2,
};

export function evaluate(context: RiskContext): RiskResult {
  const fired = config.rules.filter((rule) => fires(rule, context));
  const score = Math.max(
    0,
    Math.min(
      100,
      fired.reduce((sum, rule) => sum + (rule.weight ?? 0), 0),
    ),
  );
  let verdict = verdictFromScore(score);
  const instantVerdict = highest(fired.flatMap((rule) => rule.instant ?? []));
  if (instantVerdict) verdict = instantVerdict;
  for (const floor of fired.flatMap((rule) => rule.forceMin ?? [])) {
    verdict = atLeast(verdict, floor);
  }
  if (fired.some((rule) => rule.severity === "critical")) {
    verdict = atLeast(verdict, config.postRules.anyCriticalMinVerdict);
  }
  const reasons = fired
    .map<RiskReason>((rule) => ({
      id: rule.id,
      weight: rule.weight ?? 0,
      severity: rule.severity,
      title: rule.title,
      detail: rule.detail,
    }))
    .sort(
      (a, b) =>
        severityRank[b.severity] - severityRank[a.severity] ||
        Math.abs(b.weight) - Math.abs(a.weight),
    );
  return {
    score,
    verdict,
    reasons,
    ...(instantVerdict ? { instantVerdict } : {}),
  };
}

export function verdictFromScore(score: number): Verdict {
  if (score >= config.thresholds.danger) return "danger";
  if (score >= config.thresholds.caution) return "caution";
  return "safe";
}

function fires(rule: Rule, context: RiskContext): boolean {
  const [name, argument] = rule.signal.split(":", 2);
  return signalRegistry[name]?.(context, argument) ?? false;
}

function highest(verdicts: Verdict[]): Verdict | undefined {
  return verdicts.sort((a, b) => rank[b] - rank[a])[0];
}

function atLeast(verdict: Verdict, floor: Verdict): Verdict {
  return rank[verdict] >= rank[floor] ? verdict : floor;
}
