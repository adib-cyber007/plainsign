import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");
const sepoliaMode = process.env.PLAIN_SIGN_E2E_DEMO_CHAIN === "11155111";
const mockAccount =
  process.env.MOCK_WALLET_ACCOUNT ??
  "0x1111111111111111111111111111111111111111";

interface RunningDemo {
  context: BrowserContext;
  page: Page;
  profilePath: string;
}

test("the demo produces danger, danger, danger, safe, safe, danger, danger", async () => {
  const running = await openDemo();
  try {
    const { page } = running;
    const query = new URLSearchParams({
      walletAccount: mockAccount,
      walletChainId: sepoliaMode ? "0xaa36a7" : "0x7a69",
    });
    await page.goto(`http://localhost:5173/?${query}`);
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
    const deployment = JSON.parse(
      readFileSync(
        path.resolve(
          "demo-dapp",
          "src",
          "deployments",
          `${sepoliaMode ? 11155111 : 31337}.json`,
        ),
        "utf8",
      ),
    ) as { attacker: string };
    const attacker = `${deployment.attacker.slice(0, 6)}…${deployment.attacker.slice(-4)}`;
    const dangerSummaries = {
      "free-mint":
        `This gives ${attacker} — a personal wallet, not an app — permission to move every NFT you own in this collection.`,
      claim:
        `This gives ${attacker} — a personal wallet, not an app — permission to take all of your tokens, forever.`,
      verify:
        `This signature lets ${attacker} — a personal wallet, not an app — move all of your tokens, forever with no practical expiry.`,
    } as const;
    for (const action of ["free-mint", "claim", "verify"] as const) {
      await page.locator(`#${action}`).click();
      verdicts.push(await verdictLabel(page));
      expect(await shadowText(page, ".ps-summary")).toBe(dangerSummaries[action]);
      if (sepoliaMode && action === "free-mint") {
        await clickShadow(page, ".ps-toggle button:last-child");
        expect(await shadowText(page, ".ps-detail-list")).toContain(
          "created 0 days ago",
        );
        expect(await totalDuration(page)).toBeLessThan(2_000);
      }
      if (sepoliaMode && action === "claim") {
        expect(await shadowText(page, ".ps-reasons")).toContain(
          "Unverified contract source",
        );
      }
      await clickShadow(page, ".ps-reject");
      await expect(page.getByTestId(`${action}-outcome`)).toHaveText("Rejected (4001)");
    }

    await page.locator("#sign-in").click();
    verdicts.push(await verdictLabel(page));
    expect(await shadowText(page, ".ps-summary")).toBe(
      "You're signing a login message for localhost. This can't move any assets.",
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

    await page.locator(".more-tests > summary").click();

    await page.locator("#sign-hash").click();
    verdicts.push(await verdictLabel(page));
    expect(await shadowText(page, ".ps-summary")).toBe(
      "You're being asked to sign an unreadable code. This could authorize anything.",
    );
    expect(await shadowText(page, ".ps-reasons")).toContain(
      "Signing an opaque 32-byte hash",
    );
    await clickShadow(page, ".ps-reject");
    await expect(page.getByTestId("sign-hash-outcome")).toHaveText(
      "Rejected (4001)",
    );

    await page.locator("#list-zero").click();
    verdicts.push(await verdictLabel(page));
    expect(await shadowText(page, ".ps-summary")).toBe(
      "This lists your NFT #1 for sale for 0 ETH — anyone can take it for free.",
    );
    expect(await shadowText(page, ".ps-reasons")).toContain(
      "Listing your NFTs for ~0",
    );
    await clickShadow(page, ".ps-reject");
    await expect(page.getByTestId("list-zero-outcome")).toHaveText(
      "Rejected (4001)",
    );

    expect(verdicts).toEqual([
      "Danger",
      "Danger",
      "Danger",
      "Safe",
      "Safe",
      "Danger",
      "Danger",
    ]);

    if (sepoliaMode) {
      await page.locator("#free-mint").click();
      expect(await verdictLabel(page)).toBe("Danger");
      await clickShadow(page, ".ps-toggle button:last-child");
      expect(await totalDuration(page)).toBeLessThan(200);
      await clickShadow(page, ".ps-reject");
    }
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

async function totalDuration(page: Page): Promise<number> {
  const value = await page.evaluate(
    () =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(".ps-stage-timings")
        ?.getAttribute("data-total-ms") ?? "",
  );
  const duration = Number(value);
  if (!Number.isFinite(duration)) throw new Error("Missing analysis duration.");
  return duration;
}
