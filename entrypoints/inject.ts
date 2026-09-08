declare global {
  interface Window {
    __plainsign?: {
      version: string;
      wrapped: boolean;
    };
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    console.info("[PlainSign] inject loaded");
    window.__plainsign = { version: "0.1.0", wrapped: false };
  },
});
