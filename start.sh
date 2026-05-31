#!/bin/bash
set -e

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"
BETTER_SQLITE3_DIR="$WORKSPACE_ROOT/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"

# Rebuild better-sqlite3 native bindings if not present
if [ ! -f "$BETTER_SQLITE3_DIR/build/Release/better_sqlite3.node" ]; then
  echo "[start] Rebuilding better-sqlite3 native bindings..."
  cd "$BETTER_SQLITE3_DIR"
  node-gyp rebuild --release 2>&1 || true
  cd "$WORKSPACE_ROOT"
fi

# Build the API server
echo "[start] Building API server..."
cd "$WORKSPACE_ROOT/artifacts/api-server"
pnpm run build

cd "$WORKSPACE_ROOT"

# Start the API server in background
echo "[start] Starting API server on port 8080..."
PORT=8080 DB_PATH="$WORKSPACE_ROOT/aozora.db" node --enable-source-maps "$WORKSPACE_ROOT/artifacts/api-server/dist/index.mjs" &
API_PID=$!

# Start the Expo dev server in background
echo "[start] Starting Expo dev server on port 20823..."
cd "$WORKSPACE_ROOT/artifacts/aozora"
EXPO_PACKAGER_PROXY_URL="https://$REPLIT_DEV_DOMAIN" \
  EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN" \
  EXPO_PUBLIC_REPL_ID="$REPL_ID" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN" \
  node node_modules/expo/bin/cli start --localhost --port 20823 &
EXPO_PID=$!

cd "$WORKSPACE_ROOT"

# Handle shutdown gracefully
cleanup() {
  echo "[start] Shutting down..."
  kill $API_PID 2>/dev/null || true
  kill $EXPO_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

# Start the dev proxy on port 5000 (foreground, keeps the process alive)
echo "[start] Starting dev proxy on port 5000..."
node "$WORKSPACE_ROOT/dev-proxy.js"
