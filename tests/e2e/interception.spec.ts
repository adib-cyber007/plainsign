import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");
const account = "0x1111111111111111111111111111111111111111";
const target = "0x2222222222222222222222222222222222222222";
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
            (
              window as typeof window & {
                __plainsign?: { wrapped: boolean };
              }
            ).__plainsign?.wrapped,
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

function handleNextDialog(page: Page, accept: boolean) {
  let walletEvents = 0;
  const onConsole = (message: { text(): string }) => {
    if (message.text().startsWith("[MockWallet] received")) {
      walletEvents += 1;
    }
  };
  page.on("console", onConsole);

  const dialogHandled = new Promise<{
    callsBeforeDialog: number;
    message: string;
  }>((resolve) => {
    page.once("dialog", async (dialog) => {
      const observation = {
        callsBeforeDialog: walletEvents,
        message: dialog.message(),
      };
      if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      resolve(observation);
    });
  });

  return dialogHandled.finally(() => page.off("console", onConsole));
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

    test("passes eth_chainId through without a dialog or counter increment", async () => {
      await withTestPage(mode, async (page) => {
        let dialogs = 0;
        page.on("dialog", async (dialog) => {
          dialogs += 1;
          await dialog.dismiss();
        });
        const before = await walletState(page);
        await page.locator("#chain-id").click();
        await expect(page.locator("#out")).toHaveText("0x7a69");
        const after = await walletState(page);
        expect(dialogs).toBe(0);
        expect(after.count).toBe(before.count);
        expect(after.calls).toHaveLength(0);
      });
    });

    test("accepts a transaction before forwarding identical params", async () => {
      await withTestPage(mode, async (page) => {
        const dialogHandled = handleNextDialog(page, true);
        await page.locator("#send-transaction").click();
        const dialog = await dialogHandled;
        await expect(page.locator("#out")).toHaveText(fakeTransactionHash);
        expect(dialog.callsBeforeDialog).toBe(0);
        expect(dialog.message).toContain(
          "PlainSign [caution]: Stub analysis for eth_sendTransaction",
        );

        const state = await walletState(page);
        expect(state.calls).toEqual([
          {
            method: "eth_sendTransaction",
            params: [{ from: account, to: target, value: "0x1" }],
          },
        ]);
        expect(state.sameReferences).toEqual([true]);
      });
    });

    test("rejects a transaction with EIP-1193 code 4001", async () => {
      await withTestPage(mode, async (page) => {
        const dialogHandled = handleNextDialog(page, false);
        await page.locator("#send-transaction").click();
        const dialog = await dialogHandled;
        await expect(page.locator("#out")).toHaveText("error 4001");
        expect(dialog.callsBeforeDialog).toBe(0);
        const state = await walletState(page);
        expect(state.calls).toHaveLength(0);
        expect(state.count).toBe(1);
      });
    });

    test("intercepts typed data and personal_sign but not chainId", async () => {
      await withTestPage(mode, async (page) => {
        const typedDialog = handleNextDialog(page, true);
        await page.locator("#sign-typed-data").click();
        await typedDialog;
        await expect(page.locator("#out")).toHaveText(fakeSignature);

        const messageDialog = handleNextDialog(page, true);
        await page.locator("#sign-message").click();
        await messageDialog;
        await expect(page.locator("#out")).toHaveText(fakeSignature);

        await page.locator("#chain-id").click();
        await expect(page.locator("#out")).toHaveText("0x7a69");
        const state = await walletState(page);
        expect(state.calls.map((call) => call.method)).toEqual([
          "eth_signTypedData_v4",
          "personal_sign",
        ]);
        expect(state.count).toBe(2);
      });
    });

    test("handles two sequential intercepted requests", async () => {
      await withTestPage(mode, async (page) => {
        const firstDialog = handleNextDialog(page, true);
        await page.locator("#send-transaction").click();
        await firstDialog;
        await expect(page.locator("#out")).toHaveText(fakeTransactionHash);

        const secondDialog = handleNextDialog(page, true);
        await page.locator("#sign-message").click();
        await secondDialog;
        await expect(page.locator("#out")).toHaveText(fakeSignature);

        const state = await walletState(page);
        expect(state.calls.map((call) => call.method)).toEqual([
          "eth_sendTransaction",
          "personal_sign",
        ]);
        expect(state.count).toBe(2);
      });
    });
  });
}
