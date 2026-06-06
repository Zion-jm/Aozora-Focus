#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export DB_PATH="${DB_PATH:-$WORKSPACE_ROOT/aozora.db}"
export PORT="${PORT:-8080}"

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

# Build Expo web app if not already built
DIST_DIR="$WORKSPACE_ROOT/artifacts/aozora/dist"

if [ -f "$DIST_DIR/index.html" ]; then
  echo "[start] Web build already exists — skipping export. App is live."
else
  echo "[start] No build found — exporting Expo web app (first-time build)..."
  cd "$WORKSPACE_ROOT/artifacts/aozora" && \
    node node_modules/expo/bin/cli export --platform web --output-dir dist 2>&1
  echo "[start] Export complete. App is now live."
fi

# Keep alive — wait for both processes
wait $PROXY_PID $API_PID
