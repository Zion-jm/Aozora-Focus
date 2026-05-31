import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["student", "owner", "admin"] }).notNull().default("student"),
  verificationStatus: text("verification_status", {
    enum: ["unverified", "pending", "verified", "rejected"],
  }).notNull().default("unverified"),
  isSuspended: integer("is_suspended", { mode: "boolean" }).notNull().default(false),
  avatarUrl: text("avatar_url"),
  birthday: text("birthday"),
  universityOrWorkplace: text("university_or_workplace"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  bio: text("bio"),
  phonePublic: integer("phone_public", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const verificationRecords = sqliteTable("verification_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  idImageUrl: text("id_image_url").notNull(),
  idType: text("id_type").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewNote: text("review_note"),
  submittedAt: text("submitted_at").notNull().default(sql`(datetime('now'))`),
  reviewedAt: text("reviewed_at"),
});

export const dorms = sqliteTable("dorms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  monthlyRent: real("monthly_rent").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  amenities: text("amenities").notNull().default("[]"),
  totalRooms: integer("total_rooms").notNull(),
  bedsPerRoom: integer("beds_per_room").notNull(),
  availableBeds: integer("available_beds").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  nearbyLandmark: text("nearby_landmark"),
  coverPhotoUrl: text("cover_photo_url"),
  averageRating: real("average_rating"),
  totalReviews: integer("total_reviews").notNull().default(0),
  adminNote: text("admin_note"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const dormPhotos = sqliteTable("dorm_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dormId: integer("dorm_id").notNull().references(() => dorms.id),
  url: text("url").notNull(),
  caption: text("caption"),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id").notNull().references(() => users.id),
  dormId: integer("dorm_id").notNull().references(() => dorms.id),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "rejected", "cancelled", "noted", "completed", "no_show"] }).notNull().default("pending"),
  ownerNote: text("owner_note"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const conversations = sqliteTable("conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dormId: integer("dorm_id").notNull().references(() => dorms.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  dormId: integer("dorm_id").notNull().references(() => dorms.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const dormReviews = sqliteTable("dorm_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dormId: integer("dorm_id").notNull().references(() => dorms.id),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const userReviews = sqliteTable("user_reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reviewedUserId: integer("reviewed_user_id").notNull().references(() => users.id),
  reviewerId: integer("reviewer_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  targetType: text("target_type", { enum: ["user", "dorm", "review"] }).notNull(),
  targetId: integer("target_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status", { enum: ["pending", "reviewed", "dismissed"] }).notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});
