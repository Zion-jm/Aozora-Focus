#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Rebuild native bindings for better-sqlite3 after install
npm run build-release --prefix node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3 2>/dev/null || true
