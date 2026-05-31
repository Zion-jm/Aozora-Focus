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
      role TEXT NOT NULL DEFAULT 'student',
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

    CREATE TABLE IF NOT EXISTS admin_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(admin_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES admin_conversations(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add soft-delete columns (idempotent — ignore if already exist)
  const migrations = [
    "ALTER TABLE conversations ADD COLUMN student_deleted_at TEXT",
    "ALTER TABLE conversations ADD COLUMN owner_deleted_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN admin_deleted_at TEXT",
    "ALTER TABLE admin_conversations ADD COLUMN user_deleted_at TEXT",
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
  ];
  for (const sql of migrations) {
    try { sqlite.exec(sql); } catch { /* column already exists */ }
  }

  seedDatabase(sqlite);
  seedReviewsIfEmpty(sqlite);
}

export { sqlite };
