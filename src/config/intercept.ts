import type { InterceptedMethod } from "../types";

export const INTERCEPTED_METHODS = [
  "eth_sendTransaction",
  "eth_signTypedData_v4",
  "eth_signTypedData_v3",
  "personal_sign",
  "eth_sign",
] as const satisfies readonly InterceptedMethod[];

const interceptedMethods = new Set<string>(INTERCEPTED_METHODS);

export function isInterceptedMethod(
  method: string,
): method is InterceptedMethod {
  return interceptedMethods.has(method);
}
