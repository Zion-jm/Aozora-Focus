#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export DB_PATH="${DB_PATH:-$WORKSPACE_ROOT/aozora.db}"
export PORT="${PORT:-8080}"

# Determine the correct public domain (production takes priority over dev)
if [ -n "$REPLIT_INTERNAL_APP_DOMAIN" ]; then
  CURRENT_DOMAIN="$REPLIT_INTERNAL_APP_DOMAIN"
elif [ -n "$REPLIT_DEV_DOMAIN" ]; then
  CURRENT_DOMAIN="$REPLIT_DEV_DOMAIN"
elif [ -n "$EXPO_PUBLIC_DOMAIN" ]; then
  CURRENT_DOMAIN="$EXPO_PUBLIC_DOMAIN"
else
  echo "[start] WARNING: No domain found. API calls from the web app may fail."
  CURRENT_DOMAIN="localhost"
fi

export EXPO_PUBLIC_DOMAIN="$CURRENT_DOMAIN"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"
echo "[start] DB_PATH=$DB_PATH"
echo "[start] PORT=$PORT"

# Start proxy immediately on port 5000
echo "[start] Starting proxy on port 5000..."
node "$WORKSPACE_ROOT/dev-proxy.js" &
PROXY_PID=$!

# Always ensure the native SQLite binding is ready (safe to run alongside artifact workflow).
echo "[start] Ensuring better-sqlite3 native binding..."
cd "$WORKSPACE_ROOT/artifacts/api-server" && node ensure-sqlite.mjs

# Check if something is already listening on the API port using Node.js
# (fuser/lsof are not available in this Nix environment).
check_port() {
  node -e "
    const net = require('net');
    const s = net.createServer();
    s.on('error', () => { process.stdout.write('used'); process.exit(0); });
    s.listen($PORT, () => { s.close(() => { process.stdout.write('free'); process.exit(0); }); });
  " 2>/dev/null
}

# Wait up to 20s for the artifact "API Server" workflow to start and bind the port.
# This covers the time needed for its build + server startup.
# If it doesn't show up in time (e.g. in production) we build and start our own.
API_WAIT_SECS=20
echo "[start] Waiting up to ${API_WAIT_SECS}s for API server on port $PORT..."
API_OWNED_BY_ARTIFACT=false
for i in $(seq 1 $API_WAIT_SECS); do
  STATUS=$(check_port)
  if [ "$STATUS" = "used" ]; then
    echo "[start] Port $PORT in use after ${i}s — API server managed elsewhere."
    API_OWNED_BY_ARTIFACT=true
    break
  fi
  sleep 1
done

if [ "$API_OWNED_BY_ARTIFACT" = "false" ]; then
  echo "[start] No API server found after ${API_WAIT_SECS}s — building and starting our own..."
  cd "$WORKSPACE_ROOT/artifacts/api-server" && node build.mjs
  # One final check: the artifact workflow may have started during our build.
  STATUS=$(check_port)
  if [ "$STATUS" = "free" ]; then
    cd "$WORKSPACE_ROOT/artifacts/api-server" && node --enable-source-maps dist/index.mjs &
    echo "[start] API server started (fallback mode)."
  else
    echo "[start] Port $PORT taken during build — deferring to artifact workflow."
  fi
fi

# Build Expo web app if not built, or if the domain has changed since last build
DIST_DIR="$WORKSPACE_ROOT/artifacts/aozora/dist"
DOMAIN_MARKER="$DIST_DIR/.built-domain"

LAST_DOMAIN=""
if [ -f "$DOMAIN_MARKER" ]; then
  LAST_DOMAIN=$(cat "$DOMAIN_MARKER")
fi

if [ ! -f "$DIST_DIR/index.html" ] || [ "$LAST_DOMAIN" != "$CURRENT_DOMAIN" ]; then
  if [ "$LAST_DOMAIN" != "$CURRENT_DOMAIN" ] && [ -n "$LAST_DOMAIN" ]; then
    echo "[start] Domain changed ($LAST_DOMAIN → $CURRENT_DOMAIN) — rebuilding Expo web app..."
  else
    echo "[start] No build found — exporting Expo web app (first-time build)..."
  fi
  rm -rf "$DIST_DIR"
  cd "$WORKSPACE_ROOT/artifacts/aozora" && \
    node node_modules/expo/bin/cli export --platform web --output-dir dist 2>&1
  echo "$CURRENT_DOMAIN" > "$DOMAIN_MARKER"
  echo "[start] Export complete. App is now live."
else
  echo "[start] Web build up to date for domain $CURRENT_DOMAIN — skipping export."
fi

# Keep alive — wait on the proxy
wait $PROXY_PID
