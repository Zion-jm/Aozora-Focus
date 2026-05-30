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
  `).run("Ana Dela Cruz", "ana@example.com", "+63-9351234567", studentHash, "student", "unverified");

  db.prepare(`
    INSERT INTO users (full_name, email, phone, password_hash, role, verification_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run("Juan Mendoza", "juan@example.com", "+63-9461234567", studentHash, "student", "unverified");

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
    "Affordable and spacious boarding house ideal for college students. Located just 5 minutes walk from Quezon National High School. Monthly rate includes water and electricity.",
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
    "Premium dormitory with private rooms and modern amenities. Each room has its own bathroom and study area. Generator backup and free WiFi included. Perfect for working professionals and students.",
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
    "Budget-friendly dormitory for students on a tight budget. Safe location near Lopez Market. Shared facilities but well-maintained. Great community atmosphere.",
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
