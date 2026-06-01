import { execSync } from "child_process";
import { existsSync, readdirSync, copyFileSync, mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");

const pnpmDir = resolve(WORKSPACE_ROOT, "node_modules/.pnpm");
const sqliteDirs = existsSync(pnpmDir)
  ? readdirSync(pnpmDir).filter(e => e.startsWith("better-sqlite3@"))
  : [];

const SQLITE3_DIR = sqliteDirs.length > 0
  ? resolve(pnpmDir, sqliteDirs[0], "node_modules/better-sqlite3")
  : null;

const BINARY = SQLITE3_DIR ? resolve(SQLITE3_DIR, "build/Release/better_sqlite3.node") : null;

const CACHE_DIR = resolve(WORKSPACE_ROOT, ".cache/better-sqlite3");
const CACHED_BINARY = resolve(CACHE_DIR, "better_sqlite3.node");

function tryLoad(binaryPath) {
  try {
    process.dlopen({ exports: {} }, binaryPath);
    return true;
  } catch {
    return false;
  }
}

function needsRebuild() {
  if (!BINARY || !SQLITE3_DIR) {
    console.log("[ensure-sqlite] Could not locate better-sqlite3 directory — skipping rebuild check.");
    return false;
  }

  if (existsSync(BINARY) && tryLoad(BINARY)) {
    return false;
  }

  // Try restoring from workspace cache
  if (existsSync(CACHED_BINARY)) {
    try {
      mkdirSync(resolve(SQLITE3_DIR, "build/Release"), { recursive: true });
      copyFileSync(CACHED_BINARY, BINARY);
      if (tryLoad(BINARY)) {
        console.log("[ensure-sqlite] Restored better-sqlite3 binary from cache.");
        return false;
      }
    } catch {
      // cache restore failed, fall through to rebuild
    }
  }

  return true;
}

function buildNative() {
  const BUILD_DIR = resolve(SQLITE3_DIR, "build");
  const nodeVersion = process.versions.node;
  const NODE_INC = resolve(WORKSPACE_ROOT, `.cache/node-gyp/${nodeVersion}/include/node`);

  const SQLITE3_GEN_DIR = resolve(BUILD_DIR, "Release/obj/gen/sqlite3");
  const SQLITE3_C = resolve(SQLITE3_GEN_DIR, "sqlite3.c");
  const SQLITE3_O = resolve(BUILD_DIR, "Release/obj.target/sqlite3/gen/sqlite3/sqlite3.o");
  const SQLITE3_A = resolve(BUILD_DIR, "Release/obj.target/deps/sqlite3.a");
  const BS3_O = resolve(BUILD_DIR, "Release/obj.target/better_sqlite3/src/better_sqlite3.o");
  const BS3_CPP = resolve(SQLITE3_DIR, "src/better_sqlite3.cpp");

  mkdirSync(resolve(BUILD_DIR, "Release/obj.target/sqlite3/gen/sqlite3"), { recursive: true });
  mkdirSync(resolve(BUILD_DIR, "Release/obj.target/deps"), { recursive: true });
  mkdirSync(resolve(BUILD_DIR, "Release/obj.target/better_sqlite3/src"), { recursive: true });
  mkdirSync(resolve(BUILD_DIR, "Release"), { recursive: true });

  // Step 1: Copy sqlite3 source to gen dir (runs the locate_sqlite3 node action)
  if (!existsSync(SQLITE3_C)) {
    console.log("[ensure-sqlite] Copying sqlite3 source...");
    execSync(`node copy.js "${SQLITE3_GEN_DIR}" ""`, {
      cwd: resolve(SQLITE3_DIR, "deps"),
      stdio: "inherit",
    });
  }

  // Step 2: Compile sqlite3.c
  console.log("[ensure-sqlite] Compiling sqlite3.c...");
  execSync(`gcc -o "${SQLITE3_O}" "${SQLITE3_C}" \
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
    -I"${NODE_INC}" -I"${NODE_INC}/../src" \
    -I"${NODE_INC}/../deps/uv/include" \
    -I"${NODE_INC}/../deps/v8/include" \
    -I"${SQLITE3_GEN_DIR}" \
    -fPIC -pthread -std=c99 -w -m64 -O3 -c`, { stdio: "inherit" });

  // Step 3: Archive
  console.log("[ensure-sqlite] Archiving sqlite3.a...");
  execSync(`ar crs "${SQLITE3_A}" "${SQLITE3_O}"`, { stdio: "inherit" });

  // Step 4: Compile better_sqlite3.cpp
  console.log("[ensure-sqlite] Compiling better_sqlite3.cpp...");
  execSync(`g++ -o "${BS3_O}" "${BS3_CPP}" \
    -DNODE_GYP_MODULE_NAME=better_sqlite3 \
    -DUSING_UV_SHARED=1 -DUSING_V8_SHARED=1 -DV8_DEPRECATION_WARNINGS=1 \
    -D_GLIBCXX_USE_CXX11_ABI=1 -D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE \
    -D__STDC_FORMAT_MACROS -DNDEBUG \
    -I"${NODE_INC}" -I"${NODE_INC}/../src" \
    -I"${NODE_INC}/../deps/uv/include" \
    -I"${NODE_INC}/../deps/v8/include" \
    -I"${resolve(SQLITE3_DIR, "deps")}" \
    -I"${resolve(SQLITE3_DIR, "node_modules")}" \
    -fPIC -pthread -Wall -m64 -O3 -std=c++17 -c`, { stdio: "inherit" });

  // Step 5: Link
  console.log("[ensure-sqlite] Linking better_sqlite3.node...");
  execSync(`g++ -shared -fPIC -nostartfiles -m64 \
    -o "${BINARY}" "${BS3_O}" "${SQLITE3_A}" -pthread`, { stdio: "inherit" });

  // Cache the binary
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    copyFileSync(BINARY, CACHED_BINARY);
    console.log("[ensure-sqlite] Binary cached for future restarts.");
  } catch {
    // non-fatal
  }
}

if (needsRebuild()) {
  console.log("[ensure-sqlite] Native binding missing or stale — rebuilding better-sqlite3...");
  buildNative();

  if (!existsSync(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Rebuild failed — binary still missing at", BINARY);
    process.exit(1);
  }

  if (!tryLoad(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Binary built but cannot be loaded.");
    process.exit(1);
  }

  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
