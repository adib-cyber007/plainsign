import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");
const account = "0x1111111111111111111111111111111111111111";
const target = `0x${"2".repeat(38)}aa`;
const fakeTransactionHash = `0x${"a".repeat(64)}`;
const fakeSignature = `0x${"b".repeat(130)}`;
const installModes = ["immediate", "delayed", "onload"] as const;

let workingHeadlessMode: boolean | undefined;
let reportedBrowserMode = false;

interface RunningPage {
  page: Page;
  close: () => Promise<void>;
}

async function openTestPage(installMode: string): Promise<RunningPage> {
  const attempts =
    workingHeadlessMode === undefined ? [true, false] : [workingHeadlessMode];
  const failures: string[] = [];

  for (const headless of attempts) {
    const profilePath = await mkdtemp(path.join(tmpdir(), "plainsign-e2e-"));
    try {
      const context = await chromium.launchPersistentContext(profilePath, {
        channel: "chromium",
        headless,
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
        ],
      });
      await context.addInitScript({ path: mockWalletPath });
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(`http://127.0.0.1:5174/?mode=${installMode}`);
      await page.waitForFunction(
        () =>
          Boolean(
            (window as typeof window & { __plainsign?: { wrapped: boolean } })
              .__plainsign?.wrapped,
          ),
        undefined,
        { timeout: 5_000 },
      );

      workingHeadlessMode = headless;
      if (!reportedBrowserMode) {
        console.info(
          `[PlainSign e2e] Browser mode: ${headless ? "headless" : "headed"}`,
        );
        reportedBrowserMode = true;
      }
      return {
        page,
        close: async () => {
          await context.close();
          await rm(profilePath, { force: true, recursive: true });
        },
      };
    } catch (error) {
      failures.push(`${headless ? "headless" : "headed"}: ${String(error)}`);
      await rm(profilePath, { force: true, recursive: true });
    }
  }
  throw new Error(`PlainSign extension did not load. ${failures.join(" | ")}`);
}

async function withTestPage(
  mode: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const running = await openTestPage(mode);
  try {
    await run(running.page);
  } finally {
    await running.close();
  }
}

function walletState(page: Page) {
  return page.evaluate(() => {
    const testWindow = window as typeof window & {
      ethereum: { isMetaMask: boolean };
      __plainsign: { wrapped: boolean; interceptedCalls: number };
      __walletCalls: Array<{ method: string; params?: unknown[] }>;
      __walletCallSameReference: boolean[];
    };
    return {
      calls: testWindow.__walletCalls,
      count: testWindow.__plainsign.interceptedCalls,
      isMetaMask: testWindow.ethereum.isMetaMask,
      sameReferences: testWindow.__walletCallSameReference,
      wrapped: testWindow.__plainsign.wrapped,
    };
  });
}

async function startAction(page: Page, buttonId: string): Promise<number> {
  return page.evaluate(
    (id) =>
      new Promise<number>((resolve, reject) => {
        const startedAt = performance.now();
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(
            new Error("Analyzing overlay did not mount within 5 seconds."),
          );
        }, 5_000);
        const observer = new MutationObserver(() => {
          const text = document
            .getElementById("plainsign-root")
            ?.shadowRoot?.querySelector(".ps-analyzing h1")?.textContent;
          if (text === "Analyzing…") {
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve(performance.now() - startedAt);
          }
        });
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        });
        (document.getElementById(id) as HTMLButtonElement).click();
      }),
    buttonId,
  );
}

async function waitForVerdict(
  page: Page,
  verdict: "Safe" | "Caution" | "Danger",
): Promise<void> {
  await page.waitForFunction(
    (expected) =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(".ps-verdict h1")?.textContent === expected,
    verdict,
  );
}

async function shadowText(
  page: Page,
  selector: string,
): Promise<string | null> {
  return page.evaluate(
    (value) =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(value)?.textContent ?? null,
    selector,
  );
}

async function clickShadow(page: Page, selector: string): Promise<void> {
  await page.evaluate((value) => {
    const element = document
      .getElementById("plainsign-root")
      ?.shadowRoot?.querySelector(value);
    if (!(element instanceof HTMLElement))
      throw new Error(`Missing shadow element: ${value}`);
    element.click();
  }, selector);
}

test.describe.configure({ mode: "serial" });

for (const mode of installModes) {
  test.describe(`wallet install mode: ${mode}`, () => {
    test("wraps the legacy provider and preserves MetaMask identity", async () => {
      await withTestPage(mode, async (page) => {
        const state = await walletState(page);
        expect(state.wrapped).toBe(true);
        expect(state.isMetaMask).toBe(true);
      });
    });

    test("passes eth_chainId through without an overlay", async () => {
      await withTestPage(mode, async (page) => {
        const before = await walletState(page);
        await page.locator("#chain-id").click();
        await expect(page.locator("#out")).toHaveText("0x7a69");
        const after = await walletState(page);
        expect(await page.locator("#plainsign-root").count()).toBe(0);
        expect(after.count).toBe(before.count);
        expect(after.calls).toHaveLength(0);
      });
    });

    test("shows analyzing promptly and continues with identical transaction params", async () => {
      await withTestPage(mode, async (page) => {
        expect(await startAction(page, "send-transaction")).toBeLessThan(300);
        await waitForVerdict(page, "Safe");
        expect(await shadowText(page, ".ps-summary")).toContain("You'll send");
        await clickShadow(page, ".ps-continue");
        await expect(page.locator("#out")).toHaveText(fakeTransactionHash);

        const state = await walletState(page);
        expect(state.calls).toEqual([
          {
            method: "eth_sendTransaction",
            params: [{ from: account, to: target, value: "0x1" }],
          },
        ]);
        expect(state.sameReferences).toEqual([true]);
        expect(await page.locator("#plainsign-root").count()).toBe(0);
      });
    });

    test("Reject returns EIP-1193 code 4001", async () => {
      await withTestPage(mode, async (page) => {
        await startAction(page, "send-transaction");
        await waitForVerdict(page, "Safe");
        await clickShadow(page, ".ps-reject");
        await expect(page.locator("#out")).toHaveText("error 4001");
        expect((await walletState(page)).calls).toHaveLength(0);
      });
    });

    test("Escape rejects with EIP-1193 code 4001", async () => {
      await withTestPage(mode, async (page) => {
        await startAction(page, "send-transaction");
        await waitForVerdict(page, "Safe");
        await page.keyboard.press("Escape");
        await expect(page.locator("#out")).toHaveText("error 4001");
        expect((await walletState(page)).calls).toHaveLength(0);
      });
    });

    test("shows a danger verdict and switches Beginner/Technical views", async () => {
      await withTestPage(mode, async (page) => {
        await startAction(page, "sign-typed-data");
        await waitForVerdict(page, "Danger");
        expect(await shadowText(page, ".ps-reasons")).toContain(
          "Permission goes to a personal wallet",
        );
        await clickShadow(page, ".ps-toggle button:last-child");
        expect(await shadowText(page, ".ps-detail-list")).toContain(
          "Method: eth_signTypedData_v4",
        );
        await clickShadow(page, ".ps-continue");
        await expect(page.locator("#out")).toHaveText(fakeSignature);
      });
    });

    test("blocks eth_sign with an instant danger verdict", async () => {
      await withTestPage(mode, async (page) => {
        await startAction(page, "eth-sign");
        await waitForVerdict(page, "Danger");
        expect(await shadowText(page, ".ps-reasons")).toContain(
          "Raw hash signing (eth_sign)",
        );
        await clickShadow(page, ".ps-reject");
        await expect(page.locator("#out")).toHaveText("error 4001");
        expect((await walletState(page)).calls).toHaveLength(0);
      });
    });

    test("handles a second intercepted request after the first unmounts", async () => {
      await withTestPage(mode, async (page) => {
        await startAction(page, "send-transaction");
        await waitForVerdict(page, "Safe");
        await clickShadow(page, ".ps-continue");
        await expect(page.locator("#out")).toHaveText(fakeTransactionHash);

        await startAction(page, "sign-message");
        await waitForVerdict(page, "Safe");
        await page.keyboard.press("Enter");
        await expect(page.locator("#out")).toHaveText(fakeSignature);
        expect((await walletState(page)).count).toBe(2);
      });
    });
  });
}
