---
name: Expo binary fix for pnpm workspace
description: How to fix "expo command not found" when running pnpm exec expo in an Expo/React Native pnpm monorepo on Replit
---

## The problem
In a pnpm monorepo, `pnpm exec expo` (called from the workspace root via `pnpm --filter @workspace/aozora run dev`) fails with "Command expo not found" because pnpm does not create `.bin` symlinks inside the individual package's `node_modules/.bin/` for hoisted packages.

## The fix
Create a wrapper script at `artifacts/aozora/node_modules/.bin/expo` that calls the real expo CLI using an absolute path into the pnpm store:

```sh
#!/bin/sh
EXPO_STORE="/home/runner/workspace/node_modules/.pnpm/expo@<version>_<hash>/node_modules"
exec node "$EXPO_STORE/expo/bin/cli" "$@"
```

**Why:** The expo binary in the pnpm store uses relative `basedir` resolution, which breaks when called from a symlink outside the store directory. A wrapper with an absolute path sidesteps this entirely.

**How to apply:** Any time a pnpm monorepo Expo project fails with "Command expo not found" in a workflow, find the expo package path under `node_modules/.pnpm/expo@*/node_modules/expo/bin/cli` and create this wrapper.

## Also: better-sqlite3 native module
The `better-sqlite3` native `.node` binding must be compiled for the running Node.js version. On Replit the module is pre-installed but may need `node-gyp configure && node-gyp build --release` (run with explicit `--directory` flag). The configure step is fast; the build step compiles SQLite from source (~60–90s).

**Why:** pnpm's frozen-lockfile install does not rebuild native modules. The binding ABI version (e.g. node-v115 for Node 20) must match the running Node version.
