const http = require("http");
const fs = require("fs");
const path = require("path");

const API_PORT = 8080;
const STATIC_ROOT = path.resolve(__dirname, "artifacts/aozora/dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webp": "image/webp",
};

function serveStatic(req, res) {
  if (!fs.existsSync(STATIC_ROOT)) {
    res.writeHead(503, { "content-type": "text/html" });
    res.end(
      "<html><body><h2>Aozora is building...</h2><p>The app is being compiled. Please refresh in a moment.</p><script>setTimeout(()=>location.reload(),4000)</script></body></html>",
    );
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  let pathname = url.pathname;

  // Try exact file first, then index.html fallback (SPA routing)
  const candidates = [
    path.join(STATIC_ROOT, pathname),
    path.join(STATIC_ROOT, pathname, "index.html"),
    path.join(STATIC_ROOT, "index.html"),
  ];

  for (const filePath of candidates) {
    const safe = path.normalize(filePath);
    if (!safe.startsWith(STATIC_ROOT)) continue;
    if (fs.existsSync(safe) && fs.statSync(safe).isFile()) {
      const ext = path.extname(safe).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "content-type": contentType });
      fs.createReadStream(safe).pipe(res);
      return;
    }
  }

  res.writeHead(404);
  res.end("Not found");
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith("/api")) {
    const opts = {
      hostname: "localhost",
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    const proxy = http.request(opts, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res, { end: true });
    });
    proxy.on("error", () => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "API server is starting up. Please retry in a moment." }));
    });
    req.pipe(proxy, { end: true });
  } else {
    serveStatic(req, res);
  }
});

server.listen(5000, "0.0.0.0", () => {
  console.log("Dev proxy running on port 5000 → static from dist/, API on 8080");
});
