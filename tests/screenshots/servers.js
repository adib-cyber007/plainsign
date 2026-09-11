import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const demoRoot = path.resolve("demo-dapp", "dist");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const codeAddresses = new Set([
  "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
  "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0",
  "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
]);

const demoServer = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:5173");
  const relative = url.pathname.replace(/^\/plainsign\/?/, "").replace(/^\//, "");
  const requested = path.resolve(demoRoot, relative || "index.html");
  const safePath = requested.startsWith(demoRoot) ? requested : path.join(demoRoot, "index.html");
  const filePath = await access(safePath).then(() => safePath, () => path.join(demoRoot, "index.html"));
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

const rpcServer = createServer((request, response) => {
  if (request.method === "GET") {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("PlainSign screenshot RPC");
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
    });
    response.end();
    return;
  }
  let body = "";
  request.setEncoding("utf8");
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    if (!body.trim()) {
      response.writeHead(400, { "Access-Control-Allow-Origin": "*" });
      response.end();
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      response.writeHead(400, { "Access-Control-Allow-Origin": "*" });
      response.end();
      return;
    }
    const calls = Array.isArray(payload) ? payload : [payload];
    const results = calls.map((call) => ({
      jsonrpc: "2.0",
      id: call.id,
      result: rpcResult(call.method, call.params ?? []),
    }));
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify(Array.isArray(payload) ? results : results[0]));
  });
});

demoServer.listen(5173, "127.0.0.1");
rpcServer.listen(8545, "127.0.0.1");
console.info("PlainSign screenshot servers ready");

function rpcResult(method, params) {
  if (method === "eth_chainId") return "0x7a69";
  if (method === "eth_getBalance") return "0x8ac7230489e80000";
  if (method === "eth_getCode") {
    const address = String(params[0] ?? "").toLowerCase();
    return codeAddresses.has(address) ? "0x60006000" : "0x";
  }
  if (method === "eth_blockNumber") return "0x1";
  return "0x";
}

function shutdown() {
  demoServer.closeAllConnections();
  rpcServer.closeAllConnections();
  demoServer.close();
  rpcServer.close();
  setTimeout(() => process.exit(0), 50);
}

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, shutdown);
