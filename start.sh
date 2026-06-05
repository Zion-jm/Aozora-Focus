#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

export EXPO_PUBLIC_DOMAIN="${REPLIT_DEV_DOMAIN:-$EXPO_PUBLIC_DOMAIN}"
export EXPO_PUBLIC_REPL_ID="${REPL_ID:-}"

echo "[start] EXPO_PUBLIC_DOMAIN=$EXPO_PUBLIC_DOMAIN"

# Start proxy immediately on port 5000
echo "[start] Starting proxy on port 5000..."
node "$WORKSPACE_ROOT/dev-proxy.js" &
PROXY_PID=$!

DIST_DIR="$WORKSPACE_ROOT/artifacts/aozora/dist"

if [ -f "$DIST_DIR/index.html" ]; then
  echo "[start] Web build already exists — skipping export. App is live."
else
  echo "[start] No build found — exporting Expo web app (first-time build)..."
  cd "$WORKSPACE_ROOT/artifacts/aozora" && \
    node node_modules/expo/bin/cli export --platform web --output-dir dist 2>&1
  echo "[start] Export complete. App is now live."
fi

# Keep the proxy alive
wait $PROXY_PID
