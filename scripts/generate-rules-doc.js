import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rulesPath = path.join(root, "src", "risk", "rules.json");
const readmePath = path.join(root, "README.md");
const start = "<!-- RULES_TABLE_START -->";
const end = "<!-- RULES_TABLE_END -->";

const config = JSON.parse(await readFile(rulesPath, "utf8"));
const rows = config.rules.map((rule) => {
  const effect = rule.instant
    ? `Instant ${rule.instant}`
    : rule.forceMin
      ? `${signed(rule.weight ?? 0)}; at least ${rule.forceMin}`
      : signed(rule.weight ?? 0);
  return `| \`${rule.id}\` | ${escapeCell(rule.title)} | ${rule.severity} | ${effect} |`;
});
const table = [
  start,
  `Thresholds: **Safe 0-${config.thresholds.caution - 1}**, **Caution ${config.thresholds.caution}-${config.thresholds.danger - 1}**, **Danger ${config.thresholds.danger}-100**. Any critical reason is at least Caution.`,
  "",
  "| Rule | Plain-English reason | Severity | Score effect |",
  "|---|---|---:|---:|",
  ...rows,
  end,
].join("\n");

const readme = await readFile(readmePath, "utf8");
const startIndex = readme.indexOf(start);
const endIndex = readme.indexOf(end);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error("README.md is missing the rules table markers.");
}
const next = `${readme.slice(0, startIndex)}${table}${readme.slice(endIndex + end.length)}`;
await writeFile(readmePath, next);
console.info(`Updated ${path.relative(root, readmePath)} from ${path.relative(root, rulesPath)}.`);

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|");
}
