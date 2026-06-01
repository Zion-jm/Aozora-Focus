#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[start] Starting Expo dev server on port 20823..."
pnpm --filter @workspace/aozora run dev &
EXPO_PID=$!

echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js" &
PROXY_PID=$!

wait $EXPO_PID $PROXY_PID
