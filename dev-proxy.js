const http = require("http");

const API_PORT = 8080;
const EXPO_PORTS = [3001]; // Expo dev server port

function tryProxy(req, res, ports, idx) {
  if (idx >= ports.length) {
    res.writeHead(502, { "content-type": "text/html" });
    res.end(
      "<html><body><h2>Aozora is starting up...</h2><p>The Expo dev server is initializing. Please refresh in a moment.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>",
    );
    return;
  }

  const opts = {
    hostname: "localhost",
    port: ports[idx],
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(opts, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    // this port failed, try the next one
    tryProxy(req, res, ports, idx + 1);
  });

  req.pipe(proxy, { end: true });
}

const server = http.createServer((req, res) => {
  const isApiRequest = req.url && req.url.startsWith("/api");

  if (isApiRequest) {
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
    tryProxy(req, res, EXPO_PORTS, 0);
  }
});

server.listen(5000, "0.0.0.0", () => {
  console.log(`Dev proxy running on port 5000 → Expo on ${EXPO_PORTS.join(" or ")}, API on ${API_PORT}`);
});
