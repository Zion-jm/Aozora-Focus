import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = resolve(__dirname, "../..");
const SQLITE3_DIR = resolve(
  WORKSPACE_ROOT,
  "node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
);
const BINARY = resolve(SQLITE3_DIR, "build/Release/better_sqlite3.node");

// Use the node-gyp installed via Node 20's npm (in npm global bin).
// Do NOT use pnpm's internal node-gyp — it targets Node 24 headers which
// are incompatible with the Node 20 runtime used by this server.
const NODE_GYP = resolve(
  process.env.HOME ?? "",
  ".config/npm/node_global/bin/node-gyp"
);

function needsRebuild() {
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

  if (!existsSync(NODE_GYP)) {
    console.log("[ensure-sqlite] Installing node-gyp for Node 20...");
    execSync("npm install -g node-gyp", { stdio: "inherit" });
  }

  try {
    execSync(`"${NODE_GYP}" rebuild --release`, {
      stdio: "inherit",
      cwd: SQLITE3_DIR,
    });
  } catch {
    // node-gyp exits non-zero on the node_gyp_bins cleanup step even on success
  }

  if (!existsSync(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Rebuild failed — binary still missing at", BINARY);
    process.exit(1);
  }

  // Final check: ensure the binary actually loads under this Node version
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
