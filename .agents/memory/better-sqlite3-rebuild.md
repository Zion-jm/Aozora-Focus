---
name: better-sqlite3 rebuild on Replit
description: After pnpm install, better-sqlite3 native bindings must be manually rebuilt or the API server fails with ERR_MODULE_NOT_FOUND for the .node binding.
---

# better-sqlite3 requires a manual rebuild after pnpm install

**Rule:** After `pnpm install`, run the native build step for better-sqlite3 or the API server will crash at startup.

**Why:** pnpm installs better-sqlite3 but the native `.node` binding is not pre-built for Replit's linux-x64 Node 20 environment. The `onlyBuiltDependencies` list in `pnpm-workspace.yaml` includes it, but the build sometimes fails silently during install.

**How to apply:** Run this after any fresh install:
```bash
npm run build-release --prefix node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3
```
This is already baked into `scripts/post-merge.sh` so merges handle it automatically.

**Also fixed:** `pnpm exec expo` fails in this workspace because the expo bin symlink is not hoisted. Use `node node_modules/expo/bin/cli` instead (already updated in `artifacts/aozora/package.json` dev script).
