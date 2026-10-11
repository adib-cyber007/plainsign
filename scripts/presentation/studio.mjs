// Local, human-operated microphone recorder. No cloud or speech generation.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const audioDir = path.join(root, "output/human-audio");
const manifestPath = path.join(audioDir, "selected-takes.json");
const token = randomBytes(24).toString("hex");
const origin = "http://127.0.0.1:5185";
const narration = JSON.parse(
  await readFile(path.join(root, "docs/human-narration.json"), "utf8"),
);
await mkdir(audioDir, { recursive: true });
let selected = {};
try {
  selected = JSON.parse(await readFile(manifestPath, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
let saveQueue = Promise.resolve();
const ui = path.join(import.meta.dirname, "studio");
const staticFiles = new Map([
  ["/", [path.join(ui, "index.html"), "text/html"]],
  ["/style.css", [path.join(ui, "style.css"), "text/css"]],
  ["/app.js", [path.join(ui, "app.js"), "text/javascript"]],
  ...Array.from({ length: 8 }, (_, i) => [
    `/slide-${i + 1}.png`,
    [
      path.join(
        root,
        `output/pitch-v2/slide-${String(i + 1).padStart(2, "0")}.png`,
      ),
      "image/png",
    ],
  ]),
]);
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'",
  );
  try {
    if (req.headers.host !== "127.0.0.1:5185") {
      res.writeHead(403).end();
      return;
    }
    const pathname = new URL(req.url, origin).pathname;
    if (req.method === "GET" && pathname === "/api/config") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ narration, selected, token }));
      return;
    }
    if (req.method === "POST") {
      if (
        req.headers.origin !== origin ||
        req.headers["x-studio-token"] !== token
      ) {
        res.writeHead(403).end();
        return;
      }
      const match = /^\/api\/takes\/(presentation|demo)\/([1-8])$/.exec(
        pathname,
      );
      if (!match) {
        res.writeHead(404).end();
        return;
      }
      const extension = {
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
      }[req.headers["content-type"]?.split(";")[0]];
      if (!extension) {
        res.writeHead(415).end("Unsupported audio format");
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 12 * 1024 * 1024) {
          res.writeHead(413).end("Take is too large");
          return;
        }
        chunks.push(chunk);
      }
      if (!size) {
        res.writeHead(400).end("Empty take");
        return;
      }
      const key = `${match[1]}-${match[2].padStart(2, "0")}`;
      const filename = `${key}-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
      await writeFile(path.join(audioDir, filename), Buffer.concat(chunks), {
        flag: "wx",
      });
      // Serialize manifest updates and retain every take on disk.
      const save = saveQueue.then(async () => {
        selected[key] = { filename, savedAt: new Date().toISOString() };
        const temporary = path.join(
          audioDir,
          `.selected-${randomBytes(4).toString("hex")}.json`,
        );
        await writeFile(temporary, JSON.stringify(selected, null, 2));
        await rename(temporary, manifestPath);
      });
      saveQueue = save.catch(() => {});
      await save;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ key, selected: selected[key] }));
      return;
    }
    if (
      req.method === "GET" &&
      /^\/api\/audio\/(presentation|demo)-0[1-8]$/.test(pathname)
    ) {
      const take = selected[pathname.split("/").at(-1)];
      if (!take) {
        res.writeHead(404).end();
        return;
      }
      if (path.basename(take.filename) !== take.filename)
        throw new Error("Invalid filename");
      res.setHeader(
        "Content-Type",
        take.filename.endsWith(".m4a")
          ? "audio/mp4"
          : take.filename.endsWith(".ogg")
            ? "audio/ogg"
            : "audio/webm",
      );
      res.end(await readFile(path.join(audioDir, take.filename)));
      return;
    }
    const file = staticFiles.get(pathname);
    if (req.method !== "GET" || !file) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", file[1]);
    res.end(await readFile(file[0]));
  } catch (error) {
    console.error(error.message);
    if (!res.headersSent) res.writeHead(500);
    res.end("Unable to save or load this file.");
  }
});
server.listen(5185, "127.0.0.1", () =>
  console.log(
    `PlainSign voice recorder: ${origin}\nOnly Record activates the microphone. Saved takes stay in output/human-audio/.`,
  ),
);
