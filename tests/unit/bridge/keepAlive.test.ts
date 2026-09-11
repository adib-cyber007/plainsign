import { afterEach, describe, expect, it, vi } from "vitest";

import { withServiceWorkerKeepAlive } from "../../../src/bridge/keepAlive";

afterEach(() => {
  vi.useRealTimers();
});

describe("service-worker keepalive", () => {
  it("pings while analysis is pending and always clears the interval", async () => {
    vi.useFakeTimers();
    const ping = vi.fn();
    let finish!: (value: string) => void;
    const task = new Promise<string>((resolve) => {
      finish = resolve;
    });

    const resultPromise = withServiceWorkerKeepAlive(() => task, {
      intervalMs: 10,
      ping,
    });
    await vi.advanceTimersByTimeAsync(31);
    expect(ping).toHaveBeenCalledTimes(3);

    finish("done");
    await expect(resultPromise).resolves.toBe("done");
    await vi.advanceTimersByTimeAsync(30);
    expect(ping).toHaveBeenCalledTimes(3);
  });

  it("clears the interval when analysis rejects", async () => {
    vi.useFakeTimers();
    const ping = vi.fn();
    await expect(
      withServiceWorkerKeepAlive(
        async () => {
          throw new Error("failed");
        },
        { intervalMs: 10, ping },
      ),
    ).rejects.toThrow("failed");

    await vi.advanceTimersByTimeAsync(20);
    expect(ping).not.toHaveBeenCalled();
  });
});
