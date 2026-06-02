---
name: better-sqlite3 rebuild on Replit
description: After pnpm install, better-sqlite3 native bindings must be rebuilt manually using gcc/g++ directly — node-gyp and npm rebuild both fail or time out.
---

# better-sqlite3 requires a manual gcc/g++ rebuild after pnpm install

**Rule:** After `pnpm install`, the native `.node` binding must be rebuilt by manually invoking gcc/g++ — do NOT use `npm run build-release`, `node-gyp rebuild`, or `npm rebuild` as these all time out or silently fail in the Replit bash tool.

**Why:** Compiling sqlite3.c (a large amalgamation file) takes >30s, which causes the bash tool to time out. Direct gcc invocation with output redirected works; wrapping in node-gyp or make adds overhead that causes silent failures.

**How to apply (fast path — use cached binary):**
1. Check `.cache/better-sqlite3/better_sqlite3.node` — if present, copy to build dir and verify with `process.dlopen`.
2. If missing or fails to load, use the manual gcc build below.

**Manual build steps:**
```bash
BUILD_DIR="node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/build"
NODE_INC="$HOME/.cache/node-gyp/$(node -e 'console.log(process.versions.node)')/include/node"

# 1. Copy sqlite3 source to gen dir
cd node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3/deps
node copy.js "../build/Release/obj/gen/sqlite3" ""
cd -

# 2. Compile sqlite3.c (the slow step — must run directly with gcc)
gcc -o "$BUILD_DIR/Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o" \
  "$BUILD_DIR/Release/obj/gen/sqlite3/sqlite3.c" \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_JSON1 \
  -DSQLITE_THREADSAFE=2 -DNDEBUG \
  -I"$NODE_INC" -I"$NODE_INC/../src" -I"$NODE_INC/../deps/uv/include" \
  -I"$NODE_INC/../deps/v8/include" -I"$BUILD_DIR/Release/obj/gen/sqlite3" \
  -fPIC -pthread -std=c99 -w -m64 -O3 -c

# 3. Archive
ar crs "$BUILD_DIR/Release/obj.target/deps/sqlite3.a" \
  "$BUILD_DIR/Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o"

# 4. Compile better_sqlite3.cpp
g++ -o "$BUILD_DIR/Release/obj.target/better_sqlite3/src/better_sqlite3.o" \
  ".../src/better_sqlite3.cpp" -DNDEBUG \
  -I"$NODE_INC" -I"$NODE_INC/../src" ... -fPIC -pthread -m64 -O3 -std=c++20 -c

# 5. Link
g++ -shared -fPIC -nostartfiles -m64 \
  -o "$BUILD_DIR/Release/better_sqlite3.node" \
  "$BUILD_DIR/Release/obj.target/better_sqlite3/src/better_sqlite3.o" \
  "$BUILD_DIR/Release/obj.target/deps/sqlite3.a" -pthread

# 6. Cache
cp "$BUILD_DIR/Release/better_sqlite3.node" .cache/better-sqlite3/
```

**Critical flags:**
- Use `-std=c++20` (NOT c++17) for better_sqlite3.cpp — gcc 14 on NixOS stable-25_05 requires C++20 or later; using c++17 causes a hard `#error "C++20 or later required."` build failure.
- The `.cache/node-gyp/<version>/include/node` path must match the **running** Node version exactly. If it doesn't exist, download the headers: `curl -sL https://nodejs.org/dist/v<VER>/node-v<VER>-headers.tar.gz | tar -xz --strip-components=1 -C ~/.cache/node-gyp/<VER>/`
- `SQLITE_ENABLE_COLUMN_METADATA` must be included or the binary fails to load with `undefined symbol: sqlite3_column_origin_name`.

**ensure-sqlite.mjs** and **scripts/post-merge.sh** are both updated to use this approach.

**Expo port:** Use `--port 3000` (not 20823) — Replit only allows workflows on specific ports (3000, 3001, 3002, 3003, 4200, 5000, 5173, 6000, 6800, 8000, 8008, 8080, 8099, 9000). The dev-proxy.js must forward port 5000 → 3000 accordingly.
