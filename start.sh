#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js"
