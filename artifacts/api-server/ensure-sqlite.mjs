import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
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

function needsRebuild() {
  if (!BINARY || !SQLITE3_DIR) {
    console.log("[ensure-sqlite] Could not locate better-sqlite3 directory — skipping rebuild check.");
    return false;
  }
  if (!existsSync(BINARY)) return true;
  try {
    process.dlopen({ exports: {} }, BINARY);
    return false;
  } catch {
    return true;
  }
}

if (needsRebuild()) {
  console.log("[ensure-sqlite] Native binding missing or stale — rebuilding better-sqlite3...");

  try {
    execSync("npm run build-release", {
      stdio: "inherit",
      cwd: SQLITE3_DIR,
    });
  } catch {
    // build-release may exit non-zero on cleanup step even on success
  }

  if (!existsSync(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Rebuild failed — binary still missing at", BINARY);
    process.exit(1);
  }

  try {
    process.dlopen({ exports: {} }, BINARY);
  } catch (e) {
    console.error("[ensure-sqlite] ERROR: Binary built but cannot be loaded:", e.message);
    process.exit(1);
  }

  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
