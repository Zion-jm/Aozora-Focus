#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use current Replit dev domain dynamically
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export REPLIT_EXPO_DEV_DOMAIN="${REPLIT_DEV_DOMAIN:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# ── Ensure better-sqlite3 native binding is compiled ─────────────────────────
echo "[start] Checking better-sqlite3 native binding..."
node "$WORKSPACE_ROOT/artifacts/api-server/ensure-sqlite.mjs"

# ── Build & start API server on port 8080 ────────────────────────────────────
echo "[start] Building API server..."
cd "$WORKSPACE_ROOT/artifacts/api-server" && pnpm run build 2>&1 | tail -5
cd "$WORKSPACE_ROOT"

echo "[start] Starting API server on port 8080..."
PORT=8080 NODE_ENV=development node --enable-source-maps \
  "$WORKSPACE_ROOT/artifacts/api-server/dist/index.mjs" &
API_PID=$!

# Wait for API server to be ready
for i in $(seq 1 20); do
  if curl -sf http://localhost:8080/api/healthz > /dev/null 2>&1; then
    echo "[start] API server ready."
    break
  fi
  sleep 1
done

# ── Start Expo dev server on port 20823 ──────────────────────────────────────
echo "[start] Starting Expo on port 20823..."
cd "$WORKSPACE_ROOT/artifacts/aozora" && \
  EXPO_PACKAGER_PROXY_URL="https://$REPLIT_EXPO_DEV_DOMAIN" \
  EXPO_PUBLIC_DOMAIN="$REPLIT_DEV_DOMAIN" \
  EXPO_PUBLIC_REPL_ID="$REPL_ID" \
  REACT_NATIVE_PACKAGER_HOSTNAME="$REPLIT_DEV_DOMAIN" \
  node node_modules/expo/bin/cli start --localhost --port 20823 --clear &
EXPO_PID=$!
cd "$WORKSPACE_ROOT"

# ── Dev proxy on port 5000 → routes /api → 8080, everything else → 20823 ─────
echo "[start] Starting dev proxy on port 5000 → Expo on 20823, API on 8080..."
node "$WORKSPACE_ROOT/dev-proxy.js"

# If proxy exits, clean up children
kill $API_PID $EXPO_PID 2>/dev/null
