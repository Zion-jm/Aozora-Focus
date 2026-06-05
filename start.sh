#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use current Replit dev domain dynamically
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"
export REPLIT_EXPO_DEV_DOMAIN="${REPLIT_DEV_DOMAIN:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# ── Dev proxy on port 5000 → routes /api → 8080 (API artifact), everything else → 20823/20824 (Expo artifact)
# The API server and Expo dev server are managed by their own artifact workflows.
# The proxy handles either being unavailable gracefully.
echo "[start] Starting dev proxy on port 5000 → Expo on 20823/20824, API on 8080..."
node "$WORKSPACE_ROOT/dev-proxy.js"
