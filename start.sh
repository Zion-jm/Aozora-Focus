#!/bin/bash

WORKSPACE_ROOT="$(cd "$(dirname "$0")" && pwd)"

# The Expo dev server is started by the artifacts/aozora artifact workflow.
# This script only runs the dev proxy on port 5000, forwarding to Expo on 20823.
echo "[start] Starting dev proxy on port 5000 → Expo on 20823..."
node "$WORKSPACE_ROOT/dev-proxy.js"
