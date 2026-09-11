import { chromium, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const extensionPath = path.resolve(".output", "chrome-mv3");
const mockWalletPath = path.resolve("tests", "e2e", "mock-wallet.js");
const outputDir = path.resolve("docs", "screenshots");
const account = "0x1111111111111111111111111111111111111111";
const deployment = JSON.parse(
  readFileSync(path.resolve("demo-dapp", "src", "deployments", "31337.json"), "utf8"),
) as { DemoNFT: string };

test("capture submission screenshots", async () => {
  await mkdir(outputDir, { recursive: true });
  const profilePath = await mkdtemp(path.join(tmpdir(), "plainsign-shots-"));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(profilePath, {
      channel: "chromium",
      headless: true,
      viewport: { width: 1440, height: 1000 },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await context.addInitScript({ path: mockWalletPath });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(
      `http://127.0.0.1:5173/?walletAccount=${account}&walletChainId=0x7a69`,
    );
    await page.waitForFunction(() => Boolean(window.__plainsign?.wrapped));
    await page.locator("#connect-wallet").click();
    await expect(page.locator("#free-mint")).toBeEnabled();

    await captureAction(page, "#free-mint", "Danger", "red-freemint.png");
    await captureAction(page, "#verify", "Danger", "red-permit2.png");

    await page.evaluate(({ from, to }) => {
      void window.ethereum
        ?.request({
          method: "eth_sendTransaction",
          params: [{ from, to, data: "0x12345678" }],
        })
        .catch(() => undefined);
    }, { from: account, to: deployment.DemoNFT });
    await waitForVerdict(page, "Caution");
    await page.screenshot({ path: path.join(outputDir, "yellow-unknown.png") });
    await clickShadow(page, ".ps-reject");

    await captureAction(page, "#wrap", "Safe", "green-wrap.png");

    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(worker.url()).host;
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.getByRole("button", { name: "Test danger overlay" }).click();
    await waitForVerdict(options, "Danger");
    await clickShadow(options, ".ps-toggle button:last-child");
    await options.screenshot({ path: path.join(outputDir, "technical-view.png") });

    const hexPopup = await context.newPage();
    await renderHexPopup(hexPopup);
    await hexPopup.locator("main").screenshot({
      path: path.join(outputDir, "hex-popup.png"),
    });
  } finally {
    if (context) {
      await Promise.race([
        context.close(),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ]);
    }
  }
});

async function captureAction(
  page: Page,
  selector: string,
  verdict: string,
  filename: string,
): Promise<void> {
  await page.locator(selector).click();
  await waitForVerdict(page, verdict);
  await page.screenshot({ path: path.join(outputDir, filename) });
  await clickShadow(page, ".ps-reject");
}

async function waitForVerdict(page: Page, verdict: string): Promise<void> {
  await page.waitForFunction(
    (expected) =>
      document
        .getElementById("plainsign-root")
        ?.shadowRoot?.querySelector(".ps-verdict h1")?.textContent === expected,
    verdict,
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

async function renderHexPopup(page: Page): Promise<void> {
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111318;color:#f5f7fb;font-family:Inter,Segoe UI,sans-serif}
    main{width:430px;border:1px solid #343a46;border-radius:18px;background:#20242d;box-shadow:0 30px 100px #000;padding:24px}
    header{display:flex;align-items:center;gap:12px;border-bottom:1px solid #343a46;padding-bottom:18px}.fox{font-size:34px}h1{margin:0;font-size:21px}small{color:#9da7b7}
    .site{margin:18px 0;padding:12px;border-radius:10px;background:#181b22;text-align:center;font-weight:700}.warning{color:#ffcf70;font-weight:750}
    h2{font-size:14px;color:#aeb7c6;margin:18px 0 8px}.hex{max-height:190px;overflow:hidden;border:1px solid #414958;border-radius:10px;padding:14px;background:#13161c;color:#aeb7c6;font:12px/1.6 Consolas,monospace;overflow-wrap:anywhere}
    footer{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}button{height:46px;border-radius:24px;border:1px solid #5575ff;background:transparent;color:#dce5ff;font-weight:800}.confirm{background:#5575ff;color:white}
  </style></head><body><main><header><span class="fox">🦊</span><div><h1>Transaction request</h1><small>Sepolia test network</small></div></header><div class="site">catdrop.example</div><p class="warning">Only confirm if you understand the request.</p><h2>HEX DATA</h2><div class="hex">0xa22cb4650000000000000000000000003b497ae93753967d3ea96cf04a517c3da0e660030000000000000000000000000000000000000000000000000000000000000001</div><footer><button>Reject</button><button class="confirm">Confirm</button></footer></main></body></html>`);
}
