import { formatEther, formatUnits, type Address } from "viem";

import { shortAddr } from "../lib/shortAddr";
import type {
  AddressInfo,
  Explanation,
  Intent,
  RiskResult,
  SimulationResult,
} from "../types";
import { templates, type TemplateContext } from "./templates";

export interface ExplainOptions {
  chainId?: number;
  now?: number;
  degraded?: boolean;
}

export function explain(
  intent: Intent,
  simulation: SimulationResult,
  risk: RiskResult,
  addresses: Record<string, AddressInfo>,
  options: ExplainOptions = {},
): Explanation {
  const context = templateContext(
    intent,
    simulation,
    addresses,
    options.now ?? unixNow(),
  );
  const template = templates[intent.kind];
  const beginner = [
    ...template.beginner(intent, context),
    ...simulationBullets(simulation),
  ];
  if (options.degraded || intent.decodeError) {
    beginner.push(
      "PlainSign could not fully analyze this request. Only continue if you trust this site.",
    );
  }
  return {
    summary: template.summary(intent, context),
    beginner,
    technical: technicalDetails(intent, options.chainId),
    whatCouldGoWrong: risk.reasons[0]?.detail,
    source: "template",
  };
}

function templateContext(
  intent: Intent,
  simulation: SimulationResult,
  addresses: Record<string, AddressInfo>,
  now: number,
): TemplateContext {
  const party =
    intent.spender ?? intent.operator ?? intent.recipient ?? intent.to;
  return {
    party: party ? displayAddress(party, addresses) : "this address",
    amount: amountText(intent, simulation),
    deadline: deadlineText(intent.deadline, now),
    tokenIds: intent.tokenIds?.map(String).join(", ") || "unknown",
    value:
      intent.value === undefined
        ? "an unknown amount"
        : formatEther(intent.value),
  };
}

function displayAddress(
  address: Address,
  addresses: Record<string, AddressInfo>,
): string {
  const info = addresses[address.toLowerCase()] ?? addresses[address];
  let label =
    info?.allowlisted?.protocol ?? info?.contractName ?? shortAddr(address);
  const isPersonal = info?.isContract === false;
  if (isPersonal) label += " — a personal wallet, not an app";
  if (info?.ageDays !== undefined && info.ageDays < 30) {
    label += ` (created ${info.ageDays} days ago)`;
  }
  if (isPersonal) label += " —";
  return label;
}

function amountText(intent: Intent, simulation: SimulationResult): string {
  const matching = simulation.changes.find(
    (change) => change.token?.toLowerCase() === intent.token?.toLowerCase(),
  );
  const symbol = matching?.symbol ?? "tokens";
  if (intent.isUnlimited) return `all of your ${symbol}, forever`;
  if (intent.amount === undefined) return "an unknown amount";
  const formatted =
    matching?.decimals === undefined
      ? intent.amount.toString()
      : formatUnits(intent.amount, matching.decimals);
  return `${formatted} ${symbol}`;
}

function deadlineText(deadline: number | undefined, now: number): string {
  if (deadline === undefined) return "with no stated expiry";
  const seconds = deadline - now;
  if (seconds >= 365 * 86_400) return "with no practical expiry";
  if (seconds <= 0) return "until its expired deadline";
  const days = Math.max(1, Math.ceil(seconds / 86_400));
  return `for the next ${days} day${days === 1 ? "" : "s"}`;
}

function simulationBullets(simulation: SimulationResult): string[] {
  if (simulation.reverted) {
    return [
      `Simulation says this would fail${simulation.revertReason ? `: ${simulation.revertReason}` : "."}`,
    ];
  }
  return simulation.changes.map((change) => {
    const direction = change.delta < 0n ? "lose" : "receive";
    return `Simulation shows you ${direction} ${change.formatted}.`;
  });
}

function technicalDetails(
  intent: Intent,
  chainId: number | undefined,
): string[] {
  const details = [
    `Method: ${intent.method}`,
    `Function: ${intent.functionSig ?? "n/a"}`,
    `Primary type: ${intent.primaryType ?? "n/a"}`,
    `Chain ID: ${chainId ?? intent.domain?.chainId ?? "unknown"}`,
  ];
  for (const [label, value] of [
    ["To", intent.to],
    ["Token", intent.token],
    ["Counterparty", intent.spender ?? intent.operator ?? intent.recipient],
  ] as const) {
    if (value) details.push(`${label}: ${value}`);
  }
  if (intent.amount !== undefined) details.push(`Raw amount: ${intent.amount}`);
  if (intent.value !== undefined) details.push(`Raw value: ${intent.value}`);
  if (intent.tokenIds)
    details.push(`Raw token IDs: ${intent.tokenIds.join(",")}`);
  return details;
}

function unixNow(): number {
  return Math.floor(Date.now() / 1_000);
}
