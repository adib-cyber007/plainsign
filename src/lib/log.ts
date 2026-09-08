export const LOG_PREFIX = "[PlainSign]";

export function log(...values: unknown[]): void {
  console.info(LOG_PREFIX, ...values);
}

export function logError(...values: unknown[]): void {
  console.error(LOG_PREFIX, ...values);
}
