const http = require("http");

const EXPO_PORT = 20823;
const API_PORT = 8080;

const server = http.createServer((req, res) => {
  const isApiRequest = req.url && req.url.startsWith("/api");
  const targetPort = isApiRequest ? API_PORT : EXPO_PORT;

  const opts = {
    hostname: "localhost",
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxy = http.request(opts, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    if (isApiRequest) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "API server is starting up. Please retry in a moment." }));
    } else {
      res.writeHead(502, { "content-type": "text/html" });
      res.end(
        "<html><body><h2>Aozora is starting up...</h2><p>The Expo dev server is initializing. Please refresh in a moment.</p><script>setTimeout(()=>location.reload(),3000)</script></body></html>",
      );
    }
  });

  req.pipe(proxy, { end: true });
});

server.listen(5000, "0.0.0.0", () => {
  console.log(`Dev proxy running on port 5000 → Expo on ${EXPO_PORT}, API on ${API_PORT}`);
});
