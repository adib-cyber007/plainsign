import { formatUnits } from "viem";

export { formatUnits } from "viem";

export function formatAmount(
  value: bigint,
  decimals: number,
  maxFractionDigits = 6,
): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const shortenedFraction = fraction
    .slice(0, Math.max(0, maxFractionDigits))
    .replace(/0+$/, "");
  return shortenedFraction ? `${whole}.${shortenedFraction}` : whole;
}

export function formatNative(value: bigint, maxFractionDigits = 6): string {
  return formatAmount(value, 18, maxFractionDigits);
}
