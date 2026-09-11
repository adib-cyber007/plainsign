import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");
const account = "0x1111111111111111111111111111111111111111";
const target = `0x${"2".repeat(38)}aa`;
const token = `0x${"3".repeat(40)}`;
const fakeTransactionHash = `0x${"a".repeat(64)}`;
const fakeSignature = `0x${"b".repeat(130)}`;
const eip6963Uuid = "350670db-19fa-4704-a166-e52e178b59d2";
const installModes = [
  "immediate",
  "delayed",
  "onload",
  "eip6963",
  "frozen",
] as const;

let workingHeadlessMode: boolean | undefined;
let reportedBrowserMode = false;

interface RunningPage {
  page: Page;
  close: () => Promise<void>;
}

interface PageVariant {
  layout?: "overflow-hidden" | "fixed-header";
  csp?: "strict";
  walletAccount?: string;
  walletChainId?: string;
}

async function openTestPage(
  installMode: string,
  variant: PageVariant = {},
): Promise<RunningPage> {
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
      const query = new URLSearchParams({ mode: installMode });
      if (variant.layout) query.set("layout", variant.layout);
      if (variant.csp) query.set("csp", variant.csp);
      if (variant.walletAccount) query.set("walletAccount", variant.walletAccount);
      if (variant.walletChainId) query.set("walletChainId", variant.walletChainId);
      await page.goto(`http://127.0.0.1:5174/?${query}`);
      await page.waitForFunction(
        () =>
          Boolean(
            (window as typeof window & { __plainsign?: { wrapped: boolean } })
              .__plainsign?.wrapped,
          ) &&
          Boolean(
            (
              window as typeof window & {
                __selectedWalletProvider?: unknown;
                ethereum?: unknown;
              }
            ).__selectedWalletProvider ?? window.ethereum,
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
      ethereum?: { isMetaMask: boolean };
      __selectedWalletProvider?: { isMetaMask: boolean };
      __walletRawProvider?: unknown;
      __eip6963Announcements?: string[];
      __plainsign: { wrapped: boolean; interceptedCalls: number };
      __walletCalls: Array<{ method: string; params?: unknown[] }>;
      __walletCallSameReference: boolean[];
    };
    const provider = testWindow.__selectedWalletProvider ?? testWindow.ethereum;
    return {
      calls: testWindow.__walletCalls,
      count: testWindow.__plainsign.interceptedCalls,
      isMetaMask: provider?.isMetaMask,
      announcements: testWindow.__eip6963Announcements ?? [],
      providerWasWrapped: provider !== testWindow.__walletRawProvider,
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
        expect(state.providerWasWrapped).toBe(mode !== "frozen");
      });
    });

    if (mode === "eip6963") {
      test("re-announces exactly one wrapped provider for each EIP-6963 uuid", async () => {
        await withTestPage(mode, async (page) => {
          const state = await walletState(page);
          expect(state.announcements).toEqual([eip6963Uuid]);
          expect(state.providerWasWrapped).toBe(true);
        });
      });
    }

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

test("Revoke instead rejects the original approval and proposes approve(spender, 0)", async () => {
  await withTestPage("immediate", async (page) => {
    await startAction(page, "danger-approval");
    await waitForVerdict(page, "Danger");
    expect(await shadowText(page, ".ps-reasons")).toContain(
      "Unlimited token permission",
    );

    await clickShadow(page, ".ps-revoke");
    await expect(page.locator("#out")).toHaveText("error 4001");

    const state = await walletState(page);
    expect(state.calls).toEqual([
      {
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: token,
            data: `0x095ea7b3${target.slice(2).padStart(64, "0")}${"0".repeat(64)}`,
          },
        ],
      },
    ]);
    expect(state.sameReferences).toEqual([false]);
  });
});

for (const layout of ["overflow-hidden", "fixed-header"] as const) {
  test(`keeps the overlay above a host page with ${layout}`, async () => {
    const running = await openTestPage("immediate", { layout });
    try {
      await startAction(running.page, "send-transaction");
      await waitForVerdict(running.page, "Safe");
      const geometry = await running.page.evaluate(() => {
        const host = document.getElementById("plainsign-root");
        if (!host) return undefined;
        const rect = host.getBoundingClientRect();
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          position: getComputedStyle(host).position,
          zIndex: getComputedStyle(host).zIndex,
          topmost: document.elementFromPoint(innerWidth / 2, 8) === host,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
        };
      });
      expect(geometry).toMatchObject({
        top: 0,
        left: 0,
        position: "fixed",
        zIndex: "2147483647",
        topmost: true,
      });
      expect(geometry?.width).toBe(geometry?.viewportWidth);
      expect(geometry?.height).toBe(geometry?.viewportHeight);
      await clickShadow(running.page, ".ps-reject");
    } finally {
      await running.close();
    }
  });
}

test("intercepts on a strict-CSP page", async () => {
  const running = await openTestPage("immediate", { csp: "strict" });
  try {
    await startAction(running.page, "send-transaction");
    await waitForVerdict(running.page, "Safe");
    await clickShadow(running.page, ".ps-reject");
    await expect(running.page.locator("#out")).toHaveText("error 4001");
  } finally {
    await running.close();
  }
});

test("shows the same request id only once per origin", async () => {
  const running = await openTestPage("immediate");
  try {
    const additions = await running.page.evaluate(
      ({ from, to }) =>
        new Promise<number>((resolve) => {
          let count = 0;
          const observer = new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (node instanceof HTMLElement && node.id === "plainsign-root") count += 1;
              }
            }
          });
          observer.observe(document.documentElement, { childList: true });
          const message = {
            type: "PS_ANALYZE",
            payload: {
              id: "duplicate-request-id",
              origin: location.origin,
              chainId: 31337,
              from,
              request: {
                method: "eth_sendTransaction",
                params: [{ from, to, value: "0x1" }],
              },
            },
          };
          window.postMessage(message, "*");
          window.postMessage(message, "*");
          window.setTimeout(() => {
            observer.disconnect();
            resolve(count);
          }, 250);
        }),
      { from: account, to: target },
    );
    expect(additions).toBe(1);
    await waitForVerdict(running.page, "Safe");
    await clickShadow(running.page, ".ps-reject");
  } finally {
    await running.close();
  }
});

test("options page saves controls and renders the sample danger card", async () => {
  const running = await openTestPage("immediate");
  try {
    await startAction(running.page, "send-transaction");
    await waitForVerdict(running.page, "Safe");
    await clickShadow(running.page, ".ps-reject");

    const context = running.page.context();
    await expect.poll(() => context.serviceWorkers().length).toBeGreaterThan(0);
    const worker = context
      .serviceWorkers()
      .find((candidate) => candidate.url().startsWith("chrome-extension://"));
    expect(worker).toBeDefined();
    const extensionId = new URL(worker!.url()).host;
    await running.page.goto(`chrome-extension://${extensionId}/options.html`);

    await expect(
      running.page.getByRole("heading", { name: "PlainSign safety controls" }),
    ).toBeVisible();
    const controls = running.page.getByRole("checkbox");
    await expect(controls).toHaveCount(2);
    await expect(running.page.getByRole("button", { name: "Test danger overlay" })).toBeEnabled();

    await controls.first().check();
    await expect(running.page.getByRole("status")).toHaveText("Changes saved");
    await running.page.getByRole("button", { name: "Test danger overlay" }).click();
    await waitForVerdict(running.page, "Danger");
    const technicalPressed = await running.page.evaluate(
      () =>
        document
          .getElementById("plainsign-root")
          ?.shadowRoot?.querySelector(".ps-toggle button:last-child")
          ?.getAttribute("aria-pressed"),
    );
    expect(technicalPressed).toBe("true");
    await running.page.screenshot({
      path: path.resolve("test-results", "options-danger.png"),
      fullPage: true,
    });
  } finally {
    await running.close();
  }
});

if (process.env.PLAIN_SIGN_LIVE_SIMULATION === "1") {
  test("renders live Sepolia WETH balance changes through the extension bundle", async () => {
    const victim = "0x58F678D1cbCea837821EF615985fa12C4a638132";
    const weth = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14";
    const running = await openTestPage("immediate", {
      walletAccount: victim,
      walletChainId: "0xaa36a7",
    });
    try {
      await running.page.evaluate(
        ({ from, to }) => {
          const testWindow = window as typeof window & {
            ethereum: {
              request(args: { method: string; params: unknown[] }): Promise<unknown>;
            };
            __lastRequestArgs?: unknown;
          };
          const args = {
            method: "eth_sendTransaction",
            params: [
              {
                from,
                to,
                data: "0xd0e30db0",
                value: "0x2386f26fc10000",
              },
            ],
          };
          testWindow.__lastRequestArgs = args;
          void testWindow.ethereum.request(args).catch(() => undefined);
        },
        { from: victim, to: weth },
      );

      await waitForVerdict(running.page, "Safe");
      const changes = await shadowText(running.page, ".ps-change-list");
      expect(changes).toContain("-0.01 ETH");
      expect(changes).toContain("+0.01 WETH");
      await clickShadow(running.page, ".ps-reject");
    } finally {
      await running.close();
    }
  });
}
