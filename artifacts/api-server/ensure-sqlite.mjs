import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SQLITE3_DIR = resolve(
  __dirname,
  "../../node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3"
);
const BINARY = resolve(SQLITE3_DIR, "build/Release/better_sqlite3.node");

function findNodeGyp() {
  const candidates = [
    resolve(process.env.HOME ?? "", ".config/npm/node_global/bin/node-gyp"),
    resolve(process.env.HOME ?? "", ".config/npm/node_global/lib/node_modules/node-gyp/bin/node-gyp.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return "node-gyp";
}

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
  const nodeGyp = findNodeGyp();
  const cmd = nodeGyp.endsWith(".js")
    ? `node "${nodeGyp}" rebuild --release`
    : `"${nodeGyp}" rebuild --release`;
  try {
    execSync(cmd, { stdio: "inherit", cwd: SQLITE3_DIR });
  } catch {
    // node-gyp exits non-zero on the node_gyp_bins cleanup step even on success
  }
  if (!existsSync(BINARY)) {
    console.error("[ensure-sqlite] ERROR: Rebuild failed — binary still missing at", BINARY);
    process.exit(1);
  }
  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
