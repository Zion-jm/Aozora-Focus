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

# ── Wait for API server (started by artifact workflow) ────────────────────────
echo "[start] Waiting for API server on port 8080..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/api/healthz > /dev/null 2>&1; then
    echo "[start] API server ready."
    break
  fi
  sleep 2
done

# ── Dev proxy on port 5000 → routes /api → 8080, everything else → 20823/20824
echo "[start] Starting dev proxy on port 5000 → Expo on 20823/20824, API on 8080..."
node "$WORKSPACE_ROOT/dev-proxy.js"
