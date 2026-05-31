#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild native bindings for better-sqlite3 after install
BETTER_SQLITE3_DIR="node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
if [ -d "$BETTER_SQLITE3_DIR" ]; then
  cd "$BETTER_SQLITE3_DIR"
  (npx node-gyp rebuild --release 2>/dev/null || npm run build-release 2>/dev/null) || true
  cd -
fi
