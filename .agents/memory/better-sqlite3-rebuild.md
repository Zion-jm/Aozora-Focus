---
name: better-sqlite3 rebuild on Replit
description: After pnpm install, better-sqlite3 native bindings must be rebuilt for Node 20; pnpm's internal node-gyp targets Node 24 which is incompatible.
---

# better-sqlite3 requires a manual rebuild after pnpm install

**Rule:** After `pnpm install`, the native `.node` binding must be rebuilt using Node 20's node-gyp — NOT pnpm's internal node-gyp (which targets Node 24).

**Why:** pnpm bundles its own node-gyp that compiles against Node 24 headers, but the server runtime is Node 20. The binary compiled for Node 24 fails to load on Node 20 with `ERR_DLOPEN_FAILED: undefined symbol: _ZN2v812api_internal33ConvertToJSGlobalProxyIfNecessaryEm`.

**How to apply:**
1. Install node-gyp via Node 20's npm: `npm install -g node-gyp`
2. Rebuild in the pnpm package dir:
   ```bash
   cd node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3
   ~/.config/npm/node_global/bin/node-gyp rebuild --release
   ```
   (The `node_gyp_bins` cleanup error at the end is harmless — binary is built successfully.)
3. Verify: `node -e "process.dlopen({exports:{}}, '<path>/better_sqlite3.node'); console.log('OK')"`

**ensure-sqlite.mjs** is already updated to use `~/.config/npm/node_global/bin/node-gyp` (Node 20) instead of pnpm's gyp, and installs node-gyp automatically if missing.

**Also fixed:** `pnpm exec expo` fails in this workspace because the expo bin symlink is not hoisted. Use `node node_modules/expo/bin/cli` instead (already updated in `artifacts/aozora/package.json` dev script).
