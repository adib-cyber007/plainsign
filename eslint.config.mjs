import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".output/**",
      ".wxt/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        ...globals.node,
      },
    },
    rules: {
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { varsIgnorePattern: "^Hex$" },
      ],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["tests/e2e/mock-wallet.js"],
    languageOptions: {
      globals: globals.browser,
    },
  },
);
