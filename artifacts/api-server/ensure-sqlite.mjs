import { execSync } from "child_process";
import { existsSync, readdirSync, copyFileSync, mkdirSync } from "fs";
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

// Also check a cached copy in the workspace (survives across restarts)
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

  // Check if binary exists and loads
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

if (needsRebuild()) {
  console.log("[ensure-sqlite] Native binding missing or stale — rebuilding better-sqlite3...");

  // Use node-gyp via npx for the rebuild
  const nodeGypPaths = [
    resolve(WORKSPACE_ROOT, "node_modules/.bin/node-gyp"),
    resolve(WORKSPACE_ROOT, "node_modules/.pnpm/node-gyp@10.1.0/node_modules/node-gyp/bin/node-gyp.js"),
  ];

  let built = false;
  for (const ngPath of nodeGypPaths) {
    if (existsSync(ngPath)) {
      try {
        execSync(`node "${ngPath}" rebuild --release`, {
          stdio: "inherit",
          cwd: SQLITE3_DIR,
        });
        built = true;
        break;
      } catch {
        // try next
      }
    }
  }

  if (!built) {
    // Fallback to npm run build-release
    try {
      execSync("npm run build-release", {
        stdio: "inherit",
        cwd: SQLITE3_DIR,
      });
    } catch {
      // build-release may exit non-zero on cleanup step even on success
    }
  }

  if (!existsSync(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Rebuild failed — binary still missing at", BINARY);
    process.exit(1);
  }

  if (!tryLoad(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Binary built but cannot be loaded.");
    process.exit(1);
  }

  // Cache the binary for future restarts
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    copyFileSync(BINARY, CACHED_BINARY);
    console.log("[ensure-sqlite] Binary cached for future restarts.");
  } catch {
    // non-fatal
  }

  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
