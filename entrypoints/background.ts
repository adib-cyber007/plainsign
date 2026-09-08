export default defineBackground(() => {
  console.info("[PlainSign] background loaded");

  browser.runtime.onMessage.addListener((message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "PS_PING"
    ) {
      return Promise.resolve({ type: "PS_PONG" as const });
    }

    return undefined;
  });
});
