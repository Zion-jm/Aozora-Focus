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

if (!existsSync(BINARY)) {
  console.log("[ensure-sqlite] Native binding missing — rebuilding better-sqlite3...");
  const orig = process.cwd();
  process.chdir(SQLITE3_DIR);
  execSync("npx --yes node-gyp rebuild --release", { stdio: "inherit" });
  process.chdir(orig);
  console.log("[ensure-sqlite] Rebuild complete.");
} else {
  console.log("[ensure-sqlite] better-sqlite3 binary OK.");
}
