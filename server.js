// A small Node server: serves the files in public/ and handles the audit form.
// Run with `npm start`, then open http://localhost:3000
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleLead } from "./lead.js";

// Load .env if there is one.
try {
  process.loadEnvFile(".env");
} catch {}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve("public");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

async function serveFile(res, filePath, status = 200) {
  const data = await readFile(filePath);
  res.writeHead(status, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/api/lead") return handleLead(req, res);

  // "/" -> index.html, "/thanks" -> thanks.html, everything else as is.
  let file = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  if (!path.extname(file)) file += ".html";
  const filePath = path.join(PUBLIC_DIR, file);

  try {
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) throw new Error("Outside public/");
    await serveFile(res, filePath);
  } catch {
    await serveFile(res, path.join(PUBLIC_DIR, "404.html"), 404);
  }
});

server.listen(PORT, () => console.log(`Dialkeepers running at http://localhost:${PORT}`));
