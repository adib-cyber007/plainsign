export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 1_500,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);

  if (init.signal?.aborted) {
    abortFromCaller();
  } else {
    init.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
