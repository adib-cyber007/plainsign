export interface KeepAliveDeps {
  intervalMs?: number;
  ping?: () => void | Promise<void>;
}

export async function withServiceWorkerKeepAlive<T>(
  task: () => Promise<T>,
  deps: KeepAliveDeps = {},
): Promise<T> {
  const ping = deps.ping ?? pingRuntime;
  const timer = setInterval(() => {
    void Promise.resolve(ping()).catch(() => undefined);
  }, deps.intervalMs ?? 1_000);
  try {
    return await task();
  } finally {
    clearInterval(timer);
  }
}

function pingRuntime(): void {
  try {
    chrome.runtime.getPlatformInfo(() => {
      void chrome.runtime.lastError;
    });
  } catch {
    // The pending analysis still owns the degraded fallback if the context vanished.
  }
}
