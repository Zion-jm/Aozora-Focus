#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild native bindings for better-sqlite3 after install
BETTER_SQLITE3_DIR="node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
if [ -d "$BETTER_SQLITE3_DIR" ]; then
  cd "$BETTER_SQLITE3_DIR"
  npm run build-release 2>/dev/null || true
  cd -
  # Cache the binary for fast restarts
  mkdir -p .cache/better-sqlite3
  cp "$BETTER_SQLITE3_DIR/build/Release/better_sqlite3.node" .cache/better-sqlite3/ 2>/dev/null || true
fi
# Build API server
pnpm --filter @workspace/api-server run build
