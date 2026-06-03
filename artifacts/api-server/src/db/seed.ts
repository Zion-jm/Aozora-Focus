import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

export function seedDatabase(db: Database.Database) {
  const existing = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (existing.count > 0) return;

  const adminHash = bcrypt.hashSync("admin123", 10);
  const ownerHash = bcrypt.hashSync("owner123", 10);
  const studentHash = bcrypt.hashSync("student123", 10);

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Admin User", "admin@aozora.ph", "+63-9001234567", adminHash, "admin", "verified");

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Maria Santos", "maria@example.com", "+63-9171234567", ownerHash, "owner", "verified");

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Carlos Reyes", "carlos@example.com", "+63-9281234567", ownerHash, "owner", "verified");

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Ana Dela Cruz", "ana@example.com", "+63-9351234567", studentHash, "boarder", "unverified");

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Juan Mendoza", "juan@example.com", "+63-9461234567", studentHash, "boarder", "unverified");

  const amenities1 = JSON.stringify(["WiFi", "Air Conditioning", "Private Bathroom", "Kitchen", "Laundry"]);
  const amenities2 = JSON.stringify(["WiFi", "Fan", "Shared Bathroom", "Water", "CCTV"]);
  const amenities3 = JSON.stringify(["WiFi", "Air Conditioning", "Private Bathroom", "Kitchen", "Parking", "Generator"]);
  const amenities4 = JSON.stringify(["WiFi", "Fan", "Shared Bathroom", "Study Area"]);

  db.prepare(`
    INSERT INTO dorms (owner_id, name, description, monthly_rent, address, latitude, longitude, amenities, total_rooms, beds_per_room, available_beds, nearby_landmark, status, cover_photo_url, average_rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    2,
    "Santos Dormitory",
    "A clean and comfortable dormitory near Lopez National High School. Features modern amenities and a safe, quiet environment perfect for students. 24/7 security and CCTV monitoring.",
    3500,
    "Brgy. Poblacion, Lopez, Quezon",
    13.8856, 122.2604,
    amenities1, 8, 2, 5, "Lopez National High School", "approved",
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
    4.5, 12
  );

  db.prepare(`
    INSERT INTO dorms (owner_id, name, description, monthly_rent, address, latitude, longitude, amenities, total_rooms, beds_per_room, available_beds, nearby_landmark, status, cover_photo_url, average_rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    2,
    "Blue Sky Boarding House",
    "Affordable and spacious boarding house ideal for boarders. Located just 5 minutes walk from Quezon National High School. Monthly rate includes water and electricity.",
    2500,
    "Brgy. Magallanes, Lopez, Quezon",
    13.8910, 122.2550,
    amenities2, 6, 3, 8, "Quezon National High School", "approved",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
    4.2, 8
  );

  db.prepare(`
    INSERT INTO dorms (owner_id, name, description, monthly_rent, address, latitude, longitude, amenities, total_rooms, beds_per_room, available_beds, nearby_landmark, status, cover_photo_url, average_rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    3,
    "Reyes Premium Suites",
    "Premium dormitory with private rooms and modern amenities. Each room has its own bathroom and study area. Generator backup and free WiFi included. Perfect for working professionals and boarders.",
    5500,
    "Brgy. Ilasan Norte, Lopez, Quezon",
    13.8820, 122.2680,
    amenities3, 10, 1, 3, "Lopez Town Plaza", "approved",
    "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800",
    4.8, 20
  );

  db.prepare(`
    INSERT INTO dorms (owner_id, name, description, monthly_rent, address, latitude, longitude, amenities, total_rooms, beds_per_room, available_beds, nearby_landmark, status, cover_photo_url, average_rating, total_reviews)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    3,
    "Green Hills Dorm",
    "Budget-friendly dormitory for boarders on a tight budget. Safe location near Lopez Market. Shared facilities but well-maintained. Great community atmosphere.",
    1800,
    "Brgy. Calantipayan, Lopez, Quezon",
    13.8780, 122.2520,
    amenities4, 4, 4, 10, "Lopez Public Market", "approved",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
    3.9, 5
  );

  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(1, "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800", "Common area", 0);
  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(1, "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800", "Bedroom", 1);
  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(1, "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800", "Bathroom", 2);

  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(2, "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800", "Living area", 0);
  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(2, "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800", "Room", 1);

  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(3, "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800", "Suite", 0);
  db.prepare(`
    INSERT INTO dorm_photos (dorm_id, url, caption, "order") VALUES (?, ?, ?, ?)
  `).run(3, "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800", "Bathroom", 1);
}

export function seedDummyAdminData(db: Database.Database) {
  try {
    const reportCount = (db.prepare("SELECT COUNT(*) as count FROM reports").get() as { count: number }).count;
    if (reportCount > 0) return;

    // ── Reports ──────────────────────────────────────────────────────────────
    // Ana (4) reports Blue Sky (dorm 2) — pending
    db.prepare(`INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "dorm", 2, "Misleading listing", "The photos don't match the actual room. The bathroom was shared with 8 people, not 4 as stated. Wifi barely worked.", "pending", "2026-05-20 09:12:00");

    // Juan (5) reports Ana (user 4) — pending
    db.prepare(`INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(5, "user", 4, "Harassment", "She kept knocking on my door late at night asking to borrow money. I've asked her to stop multiple times.", "pending", "2026-05-22 14:30:00");

    // Ana (4) reports Green Hills (dorm 4) — reviewed, with admin note
    db.prepare(`INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "dorm", 4, "Safety concerns", "There are no fire exits and the electrical wiring looks exposed in the hallway. This is a serious hazard.", "reviewed", "Owner has been notified and given 7 days to address the wiring issue. CCTV footage requested.", "2026-05-15 10:00:00", "2026-05-16 08:00:00");

    // Juan (5) reports Maria (user 2) — dismissed
    db.prepare(`INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, admin_note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(5, "user", 2, "Scam", "Asked me to pay a deposit outside the app directly to her GCash. I paid but didn't get the room.", "dismissed", "Reviewed conversation history. Payment was made outside the platform in violation of terms. Refund dispute referred to authorities. Report closed.", "2026-05-10 16:45:00", "2026-05-12 11:00:00");

    // Ana (4) reports a dorm review — pending
    db.prepare(`INSERT INTO reports (reporter_id, target_type, target_id, reason, details, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "review", 1, "Fake review", "This 5-star review looks fake — the reviewer never actually stayed here based on the dates.", "pending", "2026-06-01 07:55:00");

    // ── Support Tickets ───────────────────────────────────────────────────────
    // Bug report from Ana — pending
    db.prepare(`INSERT INTO support_tickets (user_id, ticket_type, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(4, "bug_report", "Cannot upload profile photo", "Every time I try to upload a profile picture it shows an error that says 'Upload failed'. I've tried on WiFi and mobile data. My phone is an Android 13.", "pending", "2026-05-28 08:20:00");

    // Account help from Juan — pending
    db.prepare(`INSERT INTO support_tickets (user_id, ticket_type, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(5, "account_help", "Cannot change my email address", "I entered the wrong email when signing up. The OTP verification keeps timing out when I try to change it in settings.", "pending", "2026-06-01 13:05:00");

    // Appeal from Maria — resolved
    db.prepare(`INSERT INTO support_tickets (user_id, ticket_type, subject, message, status, admin_response, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(2, "appeal", "Appeal: My listing was taken down unfairly", "My Santos Dormitory listing was taken down citing a policy violation but I have not violated any rules. All photos are real and I have permits. Please review.", "resolved", "After reviewing your listing and the submitted permits, we have restored your listing. We apologize for the inconvenience. Please ensure all future listing updates comply with our photo guidelines.", "2026-05-18 09:30:00", "2026-05-19 15:00:00");

    // General inquiry — guest (no user_id)
    db.prepare(`INSERT INTO support_tickets (guest_name, guest_email, ticket_type, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run("Mark Tolentino", "mark.tolentino@gmail.com", "general_inquiry", "How do I register as a dorm owner?", "I want to list my dormitory on Aozora. I have 3 rooms available near Lopez National High School. What are the requirements and fees?", "pending", "2026-06-02 10:40:00");

    // Bug report from Carlos — resolved
    db.prepare(`INSERT INTO support_tickets (user_id, ticket_type, subject, message, status, admin_response, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(3, "bug_report", "Appointment notifications not arriving", "I'm not receiving push notifications when a boarder books a visit to my dorms. I've checked my notification settings and they are enabled.", "resolved", "This has been fixed in the latest update. Ensure your app is updated to the latest version. Push notifications should now arrive within 30 seconds of a booking.", "2026-05-25 11:15:00", "2026-05-27 09:00:00");

    // ── Violations ────────────────────────────────────────────────────────────
    // Juan — minor violation (noise)
    db.prepare(`INSERT INTO violations (user_id, admin_id, category, severity, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(5, 1, "misconduct", 1, "Noise complaint from fellow boarders at Reyes Premium Suites. Loud music past midnight on two occasions.", "First offense. User was warned via platform message. No further action taken at this time.", "2026-05-14 10:00:00");

    // Ana — moderate violation (harassment)
    db.prepare(`INSERT INTO violations (user_id, admin_id, category, severity, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(4, 1, "harassment", 2, "Verified harassment complaint from Juan Mendoza (user #5). Ana repeatedly contacted him outside of agreed hours requesting money.", "Second review. User was given a formal warning. Next offense will result in account suspension.", "2026-05-23 09:30:00");

    // Maria — listing violation
    db.prepare(`INSERT INTO violations (user_id, admin_id, category, severity, description, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(2, 1, "listing_violation", 1, "Listing photos for Blue Sky Boarding House were found to be stock images not representing the actual property.", "Owner updated photos within the 48-hour grace period. Violation logged but no further penalty applied.", "2026-05-16 14:00:00");

    // ── Notifications ─────────────────────────────────────────────────────────
    // For Ana (boarder, id=4)
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "appointment_approved", "Visit Approved!", "Your visit to Santos Dormitory on April 10 at 10:00 AM has been approved by Maria Santos.", 1, 1, "appointment", "2026-04-08 14:00:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "new_message", "New message from Maria Santos", "Hi Ana! Your visit is confirmed. Please bring a valid ID on the day.", 1, 1, "conversation", "2026-04-08 14:05:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "appointment_reminder", "Visit Tomorrow", "Reminder: your visit to Santos Dormitory is tomorrow at 10:00 AM. Don't be late!", 1, 1, "appointment", "2026-04-09 08:00:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "account_warning", "Account Warning", "Your account has received a formal warning due to a verified harassment complaint. Please review our community guidelines.", 0, null, null, "2026-05-23 09:35:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(4, "report_update", "Your Report Was Reviewed", "The safety concern you reported for Green Hills Dorm has been reviewed. The owner has been notified to take action.", 0, 3, "report", "2026-05-16 08:05:00");

    // For Juan (boarder, id=5)
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(5, "appointment_approved", "Visit Approved!", "Your visit to Blue Sky Boarding House on April 15 at 2:00 PM has been approved.", 1, 2, "appointment", "2026-04-13 10:00:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(5, "account_warning", "Account Warning — Noise Complaint", "A noise complaint has been filed and verified against your account. This is your first warning. Repeated violations may result in suspension.", 0, null, null, "2026-05-14 10:05:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(5, "new_message", "New message from Carlos Reyes", "Hi Juan, please keep the noise down after 10 PM. Thank you.", 0, null, "conversation", "2026-05-13 23:45:00");

    // For Maria (owner, id=2)
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(2, "new_appointment", "New Visit Request", "Ana Dela Cruz has requested a visit to Santos Dormitory on April 10 at 10:00 AM.", 1, 1, "appointment", "2026-04-07 09:00:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(2, "listing_warning", "Listing Photo Violation", "Your listing 'Blue Sky Boarding House' has been flagged for using photos that don't represent the actual property. Please update within 48 hours.", 1, 2, "dorm", "2026-05-16 14:05:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(2, "appeal_resolved", "Your Appeal Was Accepted", "Your appeal for Santos Dormitory has been reviewed. Your listing has been fully restored.", 0, 3, "support_ticket", "2026-05-19 15:05:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(2, "new_message", "New message from Ana Dela Cruz", "Hi! I visited today and I'm very interested. Can I move in next week?", 0, 1, "conversation", "2026-05-28 16:30:00");

    // For Carlos (owner, id=3)
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(3, "new_appointment", "New Visit Request", "Ana Dela Cruz has requested a visit to Reyes Premium Suites on April 20 at 11:00 AM.", 1, 3, "appointment", "2026-04-18 11:00:00");
    db.prepare(`INSERT INTO notifications (user_id, type, title, body, is_read, related_id, related_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(3, "support_resolved", "Bug Report Resolved", "Your bug report about missing push notifications has been resolved. Please update your app.", 0, 5, "support_ticket", "2026-05-27 09:05:00");

  } catch (e) {
    console.warn("seedDummyAdminData skipped:", e);
  }
}

export function seedReviewsIfEmpty(db: Database.Database) {
  try {
    const count = (db.prepare("SELECT COUNT(*) as count FROM dorm_reviews").get() as { count: number }).count;
    if (count > 0) return;

    // Seed approved appointments so reviews are valid
    // Ana (id=4) → Santos Dormitory (id=1, owner Maria id=2)
    // Juan (id=5) → Blue Sky (id=2, owner Maria id=2)
    // Ana (id=4) → Reyes Premium Suites (id=3, owner Carlos id=3)
    db.prepare(`INSERT INTO appointments (student_id, dorm_id, preferred_date, preferred_time, message, status) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(4, 1, "2026-04-10", "10:00 AM", "I visited and loved it!", "approved");
    db.prepare(`INSERT INTO appointments (student_id, dorm_id, preferred_date, preferred_time, message, status) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(5, 2, "2026-04-15", "2:00 PM", "Looking for an affordable place.", "approved");
    db.prepare(`INSERT INTO appointments (student_id, dorm_id, preferred_date, preferred_time, message, status) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(4, 3, "2026-04-20", "11:00 AM", "Interested in the premium suite.", "approved");

    // Dorm reviews by boarders
    db.prepare(`INSERT INTO dorm_reviews (dorm_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(1, 4, 5, "Really clean and well-maintained. The owner Maria is very responsive. Highly recommend for boarders!");
    db.prepare(`INSERT INTO dorm_reviews (dorm_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(2, 5, 4, "Good value for money. Shared bathroom was always clean. WiFi could be faster but overall great stay.");
    db.prepare(`INSERT INTO dorm_reviews (dorm_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(3, 4, 5, "Premium quality as advertised. Private bathroom and generator backup are a huge plus. Worth every peso.");

    // Recalculate dorm average ratings
    db.prepare(`UPDATE dorms SET average_rating = 5.0, total_reviews = 1 WHERE id = 1`).run();
    db.prepare(`UPDATE dorms SET average_rating = 4.0, total_reviews = 1 WHERE id = 2`).run();
    db.prepare(`UPDATE dorms SET average_rating = 5.0, total_reviews = 1 WHERE id = 3`).run();

    // Owner reviews for boarders (Maria reviews Ana and Juan, Carlos reviews Ana)
    db.prepare(`INSERT INTO user_reviews (reviewed_user_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(4, 2, 5, "Ana was an excellent tenant — punctual, respectful, and kept the room spotless. Would welcome her again anytime.");
    db.prepare(`INSERT INTO user_reviews (reviewed_user_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(5, 2, 4, "Juan was a good tenant overall. Paid on time and followed house rules. Minor noise issue but resolved quickly.");
    db.prepare(`INSERT INTO user_reviews (reviewed_user_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`)
      .run(4, 3, 5, "Very responsible boarder. Treated the property with care and was always polite. Highly recommended tenant.");

    // Update user average ratings
    db.prepare(`UPDATE users SET average_rating = 5.0, total_reviews = 2 WHERE id = 4`).run();
    db.prepare(`UPDATE users SET average_rating = 4.0, total_reviews = 1 WHERE id = 5`).run();
  } catch (e) {
    console.warn("seedReviewsIfEmpty skipped:", e);
  }
}
