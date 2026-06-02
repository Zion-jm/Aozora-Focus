#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use current Replit dev domain dynamically (falls back to env or empty string)
export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# ── Dev proxy on port 5000 → Expo on 20823 ───────────────────────────────────
# The Expo and API Server are managed by their own artifact workflows.
# This script only runs the dev proxy so the Replit web preview (port 5000)
# forwards to the Expo dev server (port 20823).
echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js"
