import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import * as schema from "./schema";
import { seedDatabase, seedReviewsIfEmpty } from "./seed";

const DB_PATH = process.env["DB_PATH"] ?? path.join(process.cwd(), "aozora.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'boarder',
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      is_suspended INTEGER NOT NULL DEFAULT 0,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      id_image_url TEXT NOT NULL,
      id_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      review_note TEXT,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS dorms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      monthly_rent REAL NOT NULL,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      amenities TEXT NOT NULL DEFAULT '[]',
      total_rooms INTEGER NOT NULL,
      beds_per_room INTEGER NOT NULL,
      available_beds INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      cover_photo_url TEXT,
      average_rating REAL,
      total_reviews INTEGER NOT NULL DEFAULT 0,
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dorm_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dorm_id INTEGER NOT NULL REFERENCES dorms(id),
      url TEXT NOT NULL,
      caption TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      dorm_id INTEGER NOT NULL REFERENCES dorms(id),
      preferred_date TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      owner_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dorm_id INTEGER NOT NULL REFERENCES dorms(id),
      student_id INTEGER NOT NULL REFERENCES users(id),
      owner_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      dorm_id INTEGER NOT NULL REFERENCES dorms(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, dorm_id)
    );

    CREATE TABLE IF NOT EXISTS dorm_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dorm_id INTEGER NOT NULL REFERENCES dorms(id),
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(dorm_id, reviewer_id)
    );

    CREATE TABLE IF NOT EXISTS user_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewed_user_id INTEGER NOT NULL REFERENCES users(id),
      reviewer_id INTEGER NOT NULL REFERENCES users(id),
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(reviewed_user_id, reviewer_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      related_id INTEGER,
      related_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact TEXT NOT NULL,
      code TEXT NOT NULL,
      verification_token TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      conversation_type TEXT NOT NULL DEFAULT 'warning',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES admin_conversations(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER REFERENCES admin_conversations(id),
      user_id INTEGER REFERENCES users(id),
      guest_name TEXT,
      guest_email TEXT,
      ticket_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      attachment_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      admin_id INTEGER NOT NULL REFERENCES users(id),
      category TEXT NOT NULL,
      severity INTEGER NOT NULL,
      description TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data TEXT NOT NULL DEFAULT '{}',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Push tokens table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL,
      platform TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, token)
    );
  `);

  // Add soft-delete columns (idempotent — ignore if already exist)
  // Add columns idempotently — ignore if already exist
  const migrations = [
    "ALTER TABLE conversations ADD COLUMN student_deleted_at TEXT",
    "ALTER TABLE conversations ADD COLUMN owner_deleted_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN admin_deleted_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN user_deleted_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN conversation_type TEXT NOT NULL DEFAULT 'warning'",
    "ALTER TABLE users ADD COLUMN birthday TEXT",
    "ALTER TABLE users ADD COLUMN university_or_workplace TEXT",
    "ALTER TABLE users ADD COLUMN emergency_contact_name TEXT",
    "ALTER TABLE users ADD COLUMN emergency_contact_phone TEXT",
    "ALTER TABLE users ADD COLUMN bio TEXT",
    "ALTER TABLE dorms ADD COLUMN nearby_landmark TEXT",
    "ALTER TABLE users ADD COLUMN average_rating REAL",
    "ALTER TABLE users ADD COLUMN total_reviews INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE reports ADD COLUMN warned_at TEXT",
    "ALTER TABLE reports ADD COLUMN taken_down_at TEXT",
    "ALTER TABLE users ADD COLUMN phone_public INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE admin_conversations ADD COLUMN closed_at TEXT",
    "ALTER TABLE conversations ADD COLUMN student_archived_at TEXT",
    "ALTER TABLE conversations ADD COLUMN owner_archived_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN admin_archived_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN user_archived_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN started_at TEXT",
    "ALTER TABLE users ADD COLUMN expo_push_token TEXT",
    "ALTER TABLE messages ADD COLUMN image_url TEXT",
    "ALTER TABLE admin_messages ADD COLUMN image_url TEXT",
    "ALTER TABLE support_tickets ADD COLUMN admin_response TEXT",
    "ALTER TABLE support_tickets ADD COLUMN email_sent_at TEXT",
    "ALTER TABLE violations ADD COLUMN report_id INTEGER REFERENCES reports(id)",
    "ALTER TABLE reports ADD COLUMN violation_logged_at TEXT",
    "ALTER TABLE users ADD COLUMN suspended_until TEXT",
    "ALTER TABLE users ADD COLUMN suspension_notified_at TEXT",
  ];
  for (const sql of migrations) {
    try { sqlite.exec(sql); } catch { /* column already exists */ }
  }

  // One-time migration: rebuild admin_conversations without UNIQUE(admin_id, user_id)
  // so each support ticket can have its own isolated conversation thread.
  const adminConvSql = (sqlite.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='admin_conversations'"
  ).get() as any)?.sql ?? "";
  if (adminConvSql.toUpperCase().includes("UNIQUE")) {
    sqlite.pragma("foreign_keys = OFF");
    sqlite.exec(`CREATE TABLE IF NOT EXISTS admin_conversations_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      conversation_type TEXT NOT NULL DEFAULT 'warning',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      admin_deleted_at TEXT,
      user_deleted_at TEXT,
      closed_at TEXT,
      admin_archived_at TEXT,
      user_archived_at TEXT
    )`);
    sqlite.exec(`INSERT OR IGNORE INTO admin_conversations_new
      SELECT id, admin_id, user_id,
        COALESCE(conversation_type, 'warning'),
        created_at, updated_at,
        admin_deleted_at, user_deleted_at,
        closed_at, admin_archived_at, user_archived_at
      FROM admin_conversations`);
    sqlite.exec(`DROP TABLE admin_conversations`);
    sqlite.exec(`ALTER TABLE admin_conversations_new RENAME TO admin_conversations`);
    sqlite.pragma("foreign_keys = ON");
  }

  // Migrate legacy 'noted' status → 'cancelled'
  try {
    sqlite.exec("UPDATE appointments SET status = 'cancelled' WHERE status = 'noted'");
  } catch { /* ignore */ }

  seedDatabase(sqlite);
  seedReviewsIfEmpty(sqlite);
}

export { sqlite };
