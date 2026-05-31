#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start the dev proxy on port 5000, which forwards to the Expo dev server on 20823.
# The Expo dev server and API server are started by separate artifact workflows.
echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
exec node "$WORKSPACE_ROOT/dev-proxy.js"
