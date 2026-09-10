import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");

interface RunningDemo {
  context: BrowserContext;
  page: Page;
  profilePath: string;
}

test("the local demo produces danger, danger, danger, safe, safe", async () => {
  const running = await openDemo();
  try {
    const { page } = running;
    await page.goto("http://localhost:5173");
    await page.waitForFunction(
      () =>
        Boolean(
          (window as typeof window & { __plainsign?: { wrapped: boolean } })
            .__plainsign?.wrapped,
        ),
      undefined,
      { timeout: 5_000 },
    );
    await page.locator("#connect-wallet").click();
    await expect(page.locator("#free-mint")).toBeEnabled();

    const verdicts: string[] = [];
    const dangerSummaries = {
      "free-mint":
        "This gives 0x8626…1199 — a personal wallet, not an app — permission to move every NFT you own in this collection.",
      claim:
        "This gives 0x8626…1199 — a personal wallet, not an app — permission to take all of your tokens, forever.",
      verify:
        "This signature lets 0x8626…1199 — a personal wallet, not an app — move all of your tokens, forever with no practical expiry.",
    } as const;
    for (const action of ["free-mint", "claim", "verify"] as const) {
      await page.locator(`#${action}`).click();
      verdicts.push(await verdictLabel(page));
      expect(await shadowText(page, ".ps-summary")).toBe(dangerSummaries[action]);
      await clickShadow(page, ".ps-reject");
      await expect(page.getByTestId(`${action}-outcome`)).toHaveText("Rejected (4001)");
    }

    await page.locator("#sign-in").click();
    verdicts.push(await verdictLabel(page));
    expect(await shadowText(page, ".ps-summary")).toBe(
      "You're signing a login message for localhost.",
    );
    await clickShadow(page, ".ps-continue");
    await expect(page.getByTestId("sign-in-outcome")).toContainText("0x");

    await page.locator("#wrap").click();
    verdicts.push(await verdictLabel(page));
    expect(await shadowText(page, ".ps-summary")).toBe(
      "You'll turn 0.01 ETH into the same amount of WETH.",
    );
    await clickShadow(page, ".ps-continue");
    await expect(page.getByTestId("wrap-outcome")).toContainText("0x");

    expect(verdicts).toEqual(["Danger", "Danger", "Danger", "Safe", "Safe"]);
  } finally {
    await running.context.close();
    await rm(running.profilePath, { force: true, recursive: true });
  }
});

async function openDemo(): Promise<RunningDemo> {
  const failures: string[] = [];
  for (const headless of [true, false]) {
    const profilePath = await mkdtemp(path.join(tmpdir(), "plainsign-demo-e2e-"));
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
      return {
        context,
        page: context.pages()[0] ?? (await context.newPage()),
        profilePath,
      };
    } catch (error) {
      failures.push(`${headless ? "headless" : "headed"}: ${String(error)}`);
      await rm(profilePath, { force: true, recursive: true });
    }
  }
  throw new Error(`PlainSign demo browser did not start. ${failures.join(" | ")}`);
}

async function verdictLabel(page: Page): Promise<string> {
  await page.waitForFunction(
    () =>
      Boolean(
        document
          .getElementById("plainsign-root")
          ?.shadowRoot?.querySelector(".ps-verdict h1")?.textContent,
      ),
  );
  return page.evaluate(
    () =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(".ps-verdict h1")?.textContent ?? "",
  );
}

async function clickShadow(page: Page, selector: string): Promise<void> {
  await page.evaluate((value) => {
    const element = document
      .getElementById("plainsign-root")
      ?.shadowRoot?.querySelector(value);
    if (!(element instanceof HTMLElement)) throw new Error(`Missing shadow element: ${value}`);
    element.click();
  }, selector);
}

async function shadowText(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    (value) =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(value)?.textContent ?? "",
    selector,
  );
}
