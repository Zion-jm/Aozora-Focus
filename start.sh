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

# Ensure better-sqlite3 native binary is built and run DB migrations
echo "[start] Ensuring better-sqlite3 native binding..."
cd "$WORKSPACE_ROOT/artifacts/api-server" && node ensure-sqlite.mjs

# Build the API server if dist is missing or stale
API_DIST="$WORKSPACE_ROOT/artifacts/api-server/dist/index.mjs"
if [ ! -f "$API_DIST" ]; then
  echo "[start] Building API server..."
  cd "$WORKSPACE_ROOT/artifacts/api-server" && node build.mjs
fi

# Start the API server
echo "[start] Starting API server on port $PORT..."
cd "$WORKSPACE_ROOT/artifacts/api-server" && node --enable-source-maps dist/index.mjs &
API_PID=$!

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

# Keep alive — wait for both processes
wait $PROXY_PID $API_PID
