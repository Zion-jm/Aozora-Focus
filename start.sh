#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use current Replit dev domain dynamically (falls back to env or empty string)
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# ── 1. Build & start API server ───────────────────────────────────────────────
echo "[start] Building and starting API server on port 8080..."
(
  cd "$WORKSPACE_ROOT/artifacts/api-server"
  export NODE_ENV="${NODE_ENV:-development}"
  export PORT="${PORT:-8080}"
  node "$WORKSPACE_ROOT/artifacts/api-server/ensure-sqlite.mjs" && \
  pnpm run build && \
  node --enable-source-maps ./dist/index.mjs
) &
API_PID=$!

# ── 2. Start Expo dev server ──────────────────────────────────────────────────
echo "[start] Starting Expo dev server on port 20823..."
(
  cd "$WORKSPACE_ROOT/artifacts/aozora"
  export EXPO_PACKAGER_PROXY_URL="https://${REPLIT_EXPO_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
  export REACT_NATIVE_PACKAGER_HOSTNAME="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
  node node_modules/expo/bin/cli start --localhost --port 20823 --web
) &
EXPO_PID=$!

# ── 3. Start dev proxy on port 5000 → Expo on 20823 ─────────────────────────
echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js"

# If proxy exits, kill children
kill $API_PID $EXPO_PID 2>/dev/null
