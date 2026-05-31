#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild native bindings for better-sqlite3 after install
BETTER_SQLITE3_DIR="node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
NODE_GYP="$HOME/.config/npm/node_global/lib/node_modules/node-gyp/bin/node-gyp.js"
if [ -d "$BETTER_SQLITE3_DIR" ]; then
  cd "$BETTER_SQLITE3_DIR"
  if [ -f "$NODE_GYP" ]; then
    node "$NODE_GYP" rebuild --release 2>/dev/null || true
  else
    (npx --yes node-gyp rebuild --release 2>/dev/null) || true
  fi
  cd -
fi
# Build API server
pnpm --filter @workspace/api-server run build
