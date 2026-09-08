import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "PlainSign",
    description:
      "Explains Ethereum wallet signing requests in plain English before you approve them.",
    version: "0.1.0",
    permissions: ["storage"],
    host_permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: ["<all_urls>"],
        js: ["inject.js"],
        run_at: "document_start",
        world: "MAIN",
      },
    ],
    icons: {
      16: "icon/16.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
  },
});
