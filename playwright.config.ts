import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
  },
  reporter: "line",
  use: {
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/e2e/serve.js",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
