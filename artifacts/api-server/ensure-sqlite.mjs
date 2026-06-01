import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");
const SQLITE3_DIR = resolve(
  __dirname,
  "../../node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
);
const BINARY = resolve(SQLITE3_DIR, "build/Release/better_sqlite3.node");

function needsRebuild() {
  if (!existsSync(BINARY)) return true;
  try {
    // Try to actually load the binary — catches ABI/symbol mismatches
    process.dlopen({ exports: {} }, BINARY);
    return false;
  } catch {
    return true;
  }
}

if (needsRebuild()) {
  console.log("[ensure-sqlite] Native binding missing or stale — rebuilding better-sqlite3...");
  execSync("pnpm rebuild better-sqlite3", { stdio: "inherit", cwd: WORKSPACE_ROOT });
  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
