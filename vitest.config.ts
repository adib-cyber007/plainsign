import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/decoder/**/*.ts",
        "src/risk/**/*.ts",
        "src/explain/**/*.ts",
      ],
      thresholds: { lines: 90 },
    },
  },
});
