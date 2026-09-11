import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(directory, "fixtures", "index.html");
const fixtureScriptPath = path.join(directory, "fixtures", "app.js");
const port = 5174;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pathname = url.pathname;
  if (pathname === "/app.js") {
    const script = await readFile(fixtureScriptPath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript; charset=utf-8",
    });
    response.end(script);
    return;
  }
  if (pathname !== "/" && pathname !== "/index.html") {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  try {
    const html = await readFile(fixturePath);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      ...(url.searchParams.get("csp") === "strict"
        ? {
            "Content-Security-Policy":
              "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; object-src 'none'",
          }
        : {}),
    });
    response.end(html);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(
      error instanceof Error ? error.message : "Could not load fixture",
    );
  }
});

server.listen(port, "127.0.0.1", () => {
  console.info(`PlainSign test page: http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
