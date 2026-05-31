#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start the Expo dev server in the background
echo "[start] Starting Expo dev server on port 20823..."
pnpm --filter @workspace/aozora run dev &
EXPO_PID=$!

# Start the dev proxy on port 5000, which forwards to the Expo dev server on 20823.
echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js" &
PROXY_PID=$!

# Wait for either process to exit
wait $EXPO_PID $PROXY_PID
