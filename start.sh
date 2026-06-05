#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# Start proxy immediately on port 5000 (shows "building" page until dist/ is ready)
echo "[start] Starting proxy on port 5000..."
node "$WORKSPACE_ROOT/dev-proxy.js" &
PROXY_PID=$!

# Export Expo web app to artifacts/aozora/dist/
echo "[start] Exporting Expo web app..."
cd "$WORKSPACE_ROOT/artifacts/aozora" && \
  node node_modules/expo/bin/cli export --platform web --output-dir dist 2>&1

echo "[start] Export complete. App is now live."

# Keep the proxy alive
wait $PROXY_PID
