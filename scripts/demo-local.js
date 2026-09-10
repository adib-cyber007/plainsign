import concurrently from "concurrently";

const { result } = concurrently(
  [
    {
      command: "node scripts/run-workspace-script.js contracts chain",
      name: "chain",
      prefixColor: "blue",
    },
    {
      command: "node scripts/demo-local-workflow.js",
      name: "demo",
      prefixColor: "magenta",
    },
  ],
  {
    killOthersOn: ["failure", "success"],
    prefix: "[{name}]",
    raw: false,
  },
);

try {
  await result;
} catch (error) {
  if (!isExpectedShutdown(error)) process.exitCode = 1;
}

function isExpectedShutdown(error) {
  return (
    Array.isArray(error) &&
    error.some((event) => event?.command?.name === "demo" && event.exitCode === 0)
  );
}
