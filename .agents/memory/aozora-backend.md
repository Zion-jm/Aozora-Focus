---
name: Aozora SQLite backend
description: Key facts about how the api-server works — login field name, DB path, auth approach
---

The api-server uses better-sqlite3 directly (no Drizzle ORM, no PostgreSQL). The DB file is at `cwd()/aozora.db` relative to the api-server process, configurable via `DB_PATH` env.

**Login field:** The login endpoint accepts `identifier` (not `email`) — it accepts either email or phone.

**JWT:** `JWT_SECRET` env defaults to `"aozora-secret-key-change-in-production"` — must be changed before deployment.

**Seed accounts:** admin@aozora.ph/admin123, maria@example.com/owner123, ana@example.com/student123

**Why:** SQLite was chosen for zero-setup simplicity in this single-server deployment; the lib/db package uses PostgreSQL+Drizzle which is not used here.

**How to apply:** When adding new routes or modifying the schema, work directly in `artifacts/api-server/src/db/schema.ts` and re-run `initializeDatabase()`.
