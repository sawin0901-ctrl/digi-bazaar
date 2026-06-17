// Node-обёртка над собранным сервером TanStack Start.
// Запускает HTTP сервер, отдаёт статику из dist/client, остальное проксирует в worker.fetch().
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const CLIENT_DIR = path.join(DIST, "client");
const SERVER_ENTRY_CANDIDATES = [
  path.join(DIST, "server", "index.mjs"),
  path.join(DIST, "server", "server.js"),
];
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";

const SERVER_ENTRY = SERVER_ENTRY_CANDIDATES.find((candidate) => existsSync(candidate));

if (!SERVER_ENTRY) {
  console.error(`[node-server] Не найден серверный файл сборки. Проверял: ${SERVER_ENTRY_CANDIDATES.join(", ")}. Сначала выполните: bun run build`);
  process.exit(1);
}

const serverModule = await import(pathToFileURL(SERVER_ENTRY).href);
const worker = serverModule.default ?? serverModule;
if (!worker || typeof worker.fetch !== "function") {
  console.error(`[node-server] ${SERVER_ENTRY} не экспортирует fetch()`);
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".txt":  "text/plain; charset=utf-8",
  ".map":  "application/json; charset=utf-8",
};

async function tryServeStatic(req, res, urlPath) {
  // безопасный путь без выхода за CLIENT_DIR
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^\/+/, "");
  const full = path.join(CLIENT_DIR, safe);
  if (!full.startsWith(CLIENT_DIR)) return false;
  try {
    const s = await stat(full);
    if (!s.isFile()) return false;
    const buf = await readFile(full);
    const type = MIME[path.extname(full).toLowerCase()] || "application/octet-stream";
    const cache = full.includes(`${path.sep}assets${path.sep}`)
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600";
    res.writeHead(200, { "content-type": type, "cache-control": cache });
    res.end(buf);
    return true;
  } catch {
    return false;
  }
}

function nodeReqToFetch(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `${proto}://${host}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, String(v));
  }
  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req; // Node 20+: ReadableStream from IncomingMessage
    init.duplex = "half";
  }
  return new Request(url, init);
}

async function sendFetchResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}

const env = { ...process.env };
const ctx = { waitUntil() {}, passThroughOnException() {} };

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = (req.url || "/").split("?")[0];
    if (urlPath === "/healthz") {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("ok");
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      if (urlPath !== "/" && (await tryServeStatic(req, res, urlPath))) return;
    }
    const request = nodeReqToFetch(req);
    const response = await worker.fetch(request, env, ctx);
    await sendFetchResponse(res, response);
  } catch (err) {
    console.error("[node-server] error:", err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[node-server] entry=${SERVER_ENTRY}`);
  console.log(`[node-server] listening on http://${HOST}:${PORT}`);
});