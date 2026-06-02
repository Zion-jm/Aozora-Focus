#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[start] Ensuring better-sqlite3 native binding..."
(cd "$WORKSPACE_ROOT/artifacts/api-server" && node ensure-sqlite.mjs) || true

echo "[start] Building API server..."
(cd "$WORKSPACE_ROOT/artifacts/api-server" && node ./build.mjs) || {
  echo "[start] API build failed — check errors above"
  exit 1
}

echo "[start] Starting API server on port 8080..."
PORT=8080 NODE_ENV=development node --enable-source-maps "$WORKSPACE_ROOT/artifacts/api-server/dist/index.mjs" &
API_PID=$!

echo "[start] Starting Expo dev server on port 20823..."
(cd "$WORKSPACE_ROOT/artifacts/aozora" && \
  EXPO_PACKAGER_PROXY_URL="https://$REPLIT_EXPO_DEV_DOMAIN" \
  EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN" \
  EXPO_PUBLIC_REPL_ID="$REPL_ID" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN" \
  node node_modules/expo/bin/cli start --localhost --port 20823) &
EXPO_PID=$!

echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js"

# If proxy exits, kill children
kill $API_PID $EXPO_PID 2>/dev/null
