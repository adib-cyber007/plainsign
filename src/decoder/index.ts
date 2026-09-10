import type { AnalysisRequest, Intent } from "../types";
import { decodeMessage } from "./message";
import { decodeTransaction, type TransactionLike } from "./tx";
import { decodeTypedData } from "./typedData";

export async function decode(request: AnalysisRequest): Promise<Intent> {
  try {
    const { method, params } = request.request;
    if (method === "eth_sendTransaction") {
      return decodeTransaction(
        (params[0] ?? {}) as TransactionLike,
        request.chainId,
      );
    }
    if (
      method === "eth_signTypedData_v3" ||
      method === "eth_signTypedData_v4"
    ) {
      return decodeTypedData(params, method);
    }
    return decodeMessage(params, method);
  } catch (error) {
    return fallback(request, error);
  }
}

function fallback(request: AnalysisRequest, error: unknown): Intent {
  const method = request.request.method;
  const decodeError = error instanceof Error ? error.message : String(error);
  if (method === "eth_sendTransaction") {
    return {
      kind: "unknown_function",
      method,
      raw: request.request.params,
      decodeError,
    };
  }
  if (method === "eth_signTypedData_v3" || method === "eth_signTypedData_v4") {
    return {
      kind: "unknown_typed_data",
      method,
      raw: request.request.params,
      decodeError,
    };
  }
  return {
    kind: method === "eth_sign" ? "raw_hash" : "plain_message",
    method,
    raw: request.request.params,
    decodeError,
  };
}
