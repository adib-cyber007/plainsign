export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  main() {
    console.info("[PlainSign] content loaded");
  },
});
