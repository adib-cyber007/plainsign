import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/screenshots",
  fullyParallel: false,
  workers: 1,
  timeout: 150_000,
  expect: { timeout: 10_000 },
  reporter: "line",
  webServer: {
    command: "node tests/screenshots/servers.js",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
