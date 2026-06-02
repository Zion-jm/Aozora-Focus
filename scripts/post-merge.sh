#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Rebuild native bindings for better-sqlite3 after install
BETTER_SQLITE3_DIR="node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
BUILD_DIR="$BETTER_SQLITE3_DIR/build"
CACHE_DIR=".cache/better-sqlite3"
BINARY="$BUILD_DIR/Release/better_sqlite3.node"
NODE_INC="$HOME/.cache/node-gyp/$(node -e 'console.log(process.versions.node)')/include/node"

if [ -d "$BETTER_SQLITE3_DIR" ]; then
  # Try restoring from cache first (fast path)
  if [ -f "$CACHE_DIR/better_sqlite3.node" ]; then
    mkdir -p "$BUILD_DIR/Release"
    cp "$CACHE_DIR/better_sqlite3.node" "$BINARY" 2>/dev/null || true
  fi

  # Check if binary is usable
  if ! node -e "require('./$BETTER_SQLITE3_DIR')" 2>/dev/null; then
    echo "[post-merge] Binary missing or broken — rebuilding better-sqlite3 from source..."

    # Step 1: Compile sqlite3.c (the largest step)
    SQLITE3_C="$BUILD_DIR/Release/obj/gen/sqlite3/sqlite3.c"
    SQLITE3_O="$BUILD_DIR/Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o"
    mkdir -p "$(dirname "$SQLITE3_O")"
    # Run the locate_sqlite3 action first (copies sqlite3 source to gen dir)
    cd "$BETTER_SQLITE3_DIR/deps" && node copy.js "$BUILD_DIR/Release/obj/gen/sqlite3" "" && cd -
    gcc -o "$SQLITE3_O" "$SQLITE3_C" \
      -DNODE_GYP_MODULE_NAME=sqlite3 -DUSING_UV_SHARED=1 -DUSING_V8_SHARED=1 \
      -DV8_DEPRECATION_WARNINGS=1 -D_GLIBCXX_USE_CXX11_ABI=1 \
      -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE -D__STDC_FORMAT_MACROS \
      -DHAVE_INT16_T=1 -DHAVE_INT32_T=1 -DHAVE_INT8_T=1 -DHAVE_STDINT_H=1 \
      -DHAVE_UINT16_T=1 -DHAVE_UINT32_T=1 -DHAVE_UINT8_T=1 -DHAVE_USLEEP=1 \
      -DSQLITE_DEFAULT_CACHE_SIZE=-16000 -DSQLITE_DEFAULT_FOREIGN_KEYS=1 \
      -DSQLITE_DEFAULT_MEMSTATUS=0 -DSQLITE_DEFAULT_WAL_SYNCHRONOUS=1 \
      -DSQLITE_DQS=0 -DSQLITE_ENABLE_COLUMN_METADATA \
      -DSQLITE_ENABLE_DBSTAT_VTAB -DSQLITE_ENABLE_DESERIALIZE \
      -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_FTS3_PARENTHESIS \
      -DSQLITE_ENABLE_FTS4 -DSQLITE_ENABLE_FTS5 \
      -DSQLITE_ENABLE_GEOPOLY -DSQLITE_ENABLE_JSON1 \
      -DSQLITE_ENABLE_MATH_FUNCTIONS -DSQLITE_ENABLE_PERCENTILE \
      -DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_STAT4 \
      -DSQLITE_ENABLE_UPDATE_DELETE_LIMIT \
      -DSQLITE_LIKE_DOESNT_MATCH_BLOBS -DSQLITE_OMIT_DEPRECATED \
      -DSQLITE_OMIT_PROGRESS_CALLBACK -DSQLITE_OMIT_SHARED_CACHE \
      -DSQLITE_OMIT_TCL_VARIABLE -DSQLITE_SOUNDEX \
      -DSQLITE_THREADSAFE=2 -DSQLITE_TRACE_SIZE_LIMIT=32 \
      -DSQLITE_USE_URI=0 -DNDEBUG \
      -I"$NODE_INC" -I"$NODE_INC/../src" \
      -I"$NODE_INC/../deps/uv/include" \
      -I"$NODE_INC/../deps/v8/include" \
      -I"$BUILD_DIR/Release/obj/gen/sqlite3" \
      -fPIC -pthread -std=c99 -w -m64 -O3 -c

    # Step 2: Archive
    SQLITE3_A="$BUILD_DIR/Release/obj.target/deps/sqlite3.a"
    mkdir -p "$(dirname "$SQLITE3_A")"
    ar crs "$SQLITE3_A" "$SQLITE3_O"

    # Step 3: Compile better_sqlite3.cpp
    BS3_O="$BUILD_DIR/Release/obj.target/better_sqlite3/src/better_sqlite3.o"
    mkdir -p "$(dirname "$BS3_O")"
    g++ -o "$BS3_O" "$BETTER_SQLITE3_DIR/src/better_sqlite3.cpp" \
      -DNODE_GYP_MODULE_NAME=better_sqlite3 \
      -DUSING_UV_SHARED=1 -DUSING_V8_SHARED=1 -DV8_DEPRECATION_WARNINGS=1 \
      -D_GLIBCXX_USE_CXX11_ABI=1 -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE \
      -D__STDC_FORMAT_MACROS -DNDEBUG \
      -I"$NODE_INC" -I"$NODE_INC/../src" \
      -I"$NODE_INC/../deps/uv/include" \
      -I"$NODE_INC/../deps/v8/include" \
      -I"$BETTER_SQLITE3_DIR/deps" \
      -I"$BETTER_SQLITE3_DIR/node_modules" \
      -fPIC -pthread -Wall -m64 -O3 -std=c++20 -c

    # Step 4: Link
    mkdir -p "$BUILD_DIR/Release"
    g++ -shared -fPIC -nostartfiles -m64 \
      -o "$BINARY" "$BS3_O" "$SQLITE3_A" -pthread

    # Cache the binary
    mkdir -p "$CACHE_DIR"
    cp "$BINARY" "$CACHE_DIR/" 2>/dev/null || true
    echo "[post-merge] better-sqlite3 built and cached successfully."
  else
    echo "[post-merge] better-sqlite3 binary OK."
  fi
fi

# Build API server
pnpm --filter @workspace/api-server run build
