import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { sqlite } from "../db/index";

const router = Router();

// ─── DORM REVIEWS ─────────────────────────────────────────────────────────────

router.get("/dorms/:dormId/reviews", (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const rows = (sqlite.prepare(`
    SELECT dr.id, dr.rating, dr.comment, dr.created_at,
           dr.reviewer_id, u.full_name, u.avatar_url
    FROM dorm_reviews dr
    JOIN users u ON dr.reviewer_id = u.id
    WHERE dr.dorm_id = ?
    ORDER BY dr.created_at DESC
  `).all(dormId) as any[]);

  const reviews = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.created_at,
    reviewer: { id: r.reviewer_id, fullName: r.full_name, avatarUrl: r.avatar_url ?? null },
  }));

  const avg = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ reviews, average: avg, total: reviews.length });
});

router.get("/dorms/:dormId/reviews/can-review", requireAuth, (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const userId = req.user!.id;

  if (req.user!.role !== "student") {
    res.json({ canReview: false, reason: "Only students can review dorms" });
    return;
  }

  const appt = sqlite.prepare(
    "SELECT id FROM appointments WHERE dorm_id = ? AND student_id = ? AND status = 'completed' LIMIT 1"
  ).get(dormId, userId);

  if (!appt) {
    res.json({ canReview: false, reason: "Your visit must be marked as completed before you can leave a review", requiresCompletedVisit: true });
    return;
  }

  const existing = sqlite.prepare(
    "SELECT id FROM dorm_reviews WHERE dorm_id = ? AND reviewer_id = ? LIMIT 1"
  ).get(dormId, userId);

  if (existing) {
    res.json({ canReview: false, reason: "You've already reviewed this dorm" });
    return;
  }

  res.json({ canReview: true });
});

router.post("/dorms/:dormId/reviews", requireAuth, (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const userId = req.user!.id;
  const { rating, comment } = req.body;

  if (req.user!.role !== "student") {
    res.status(403).json({ error: "Only students can review dorms" });
    return;
  }
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const appt = sqlite.prepare(
    "SELECT id FROM appointments WHERE dorm_id = ? AND student_id = ? AND status = 'completed' LIMIT 1"
  ).get(dormId, userId);

  if (!appt) {
    res.status(403).json({ error: "Your visit must be marked as completed before you can leave a review" });
    return;
  }

  const existing = sqlite.prepare(
    "SELECT id FROM dorm_reviews WHERE dorm_id = ? AND reviewer_id = ? LIMIT 1"
  ).get(dormId, userId);

  if (existing) {
    res.status(409).json({ error: "You've already reviewed this dorm" });
    return;
  }

  sqlite.prepare(
    "INSERT INTO dorm_reviews (dorm_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)"
  ).run(dormId, userId, rating, comment ?? null);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM dorm_reviews WHERE dorm_id = ?"
  ).get(dormId) as any;

  sqlite.prepare(
    "UPDATE dorms SET average_rating = ?, total_reviews = ? WHERE id = ?"
  ).run(stats.avg, stats.count, dormId);

  res.status(201).json({ success: true });
});

// ─── USER REVIEWS ─────────────────────────────────────────────────────────────

router.get("/users/:userId/reviews", (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const rows = (sqlite.prepare(`
    SELECT ur.id, ur.rating, ur.comment, ur.created_at,
           ur.reviewer_id, u.full_name, u.avatar_url
    FROM user_reviews ur
    JOIN users u ON ur.reviewer_id = u.id
    WHERE ur.reviewed_user_id = ?
    ORDER BY ur.created_at DESC
  `).all(userId) as any[]);

  const reviews = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    createdAt: r.created_at,
    reviewer: { id: r.reviewer_id, fullName: r.full_name, avatarUrl: r.avatar_url ?? null },
  }));

  const avg = reviews.length > 0
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ reviews, average: avg, total: reviews.length });
});

router.get("/users/:userId/reviews/can-review", requireAuth, (req, res) => {
  const targetId = parseInt(req.params["userId"]!);
  const reviewerId = req.user!.id;

  if (req.user!.role !== "owner") {
    res.json({ canReview: false, reason: "Only owners can review students" });
    return;
  }
  if (reviewerId === targetId) {
    res.json({ canReview: false, reason: "You cannot review yourself" });
    return;
  }

  const appt = sqlite.prepare(`
    SELECT a.id FROM appointments a
    JOIN dorms d ON a.dorm_id = d.id
    WHERE d.owner_id = ? AND a.student_id = ? AND a.status = 'completed'
    LIMIT 1
  `).get(reviewerId, targetId);

  if (!appt) {
    res.json({ canReview: false, reason: "The student's visit must be marked as completed before you can leave a review", requiresCompletedVisit: true });
    return;
  }

  const existing = sqlite.prepare(
    "SELECT id FROM user_reviews WHERE reviewed_user_id = ? AND reviewer_id = ? LIMIT 1"
  ).get(targetId, reviewerId);

  if (existing) {
    res.json({ canReview: false, reason: "You've already reviewed this student" });
    return;
  }

  res.json({ canReview: true });
});

router.post("/users/:userId/reviews", requireAuth, (req, res) => {
  const targetId = parseInt(req.params["userId"]!);
  const reviewerId = req.user!.id;
  const { rating, comment } = req.body;

  if (req.user!.role !== "owner") {
    res.status(403).json({ error: "Only owners can review students" });
    return;
  }
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const appt = sqlite.prepare(`
    SELECT a.id FROM appointments a
    JOIN dorms d ON a.dorm_id = d.id
    WHERE d.owner_id = ? AND a.student_id = ? AND a.status = 'completed'
    LIMIT 1
  `).get(reviewerId, targetId);

  if (!appt) {
    res.status(403).json({ error: "The student's visit must be marked as completed before you can leave a review" });
    return;
  }

  const existing = sqlite.prepare(
    "SELECT id FROM user_reviews WHERE reviewed_user_id = ? AND reviewer_id = ? LIMIT 1"
  ).get(targetId, reviewerId);

  if (existing) {
    res.status(409).json({ error: "You've already reviewed this student" });
    return;
  }

  sqlite.prepare(
    "INSERT INTO user_reviews (reviewed_user_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)"
  ).run(targetId, reviewerId, rating, comment ?? null);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM user_reviews WHERE reviewed_user_id = ?"
  ).get(targetId) as any;

  try {
    sqlite.prepare(
      "UPDATE users SET average_rating = ?, total_reviews = ? WHERE id = ?"
    ).run(stats.avg, stats.count, targetId);
  } catch { /* column might not exist */ }

  res.status(201).json({ success: true });
});

// ─── EDIT / DELETE DORM REVIEW ────────────────────────────────────────────────

router.patch("/dorms/:dormId/reviews/:reviewId", requireAuth, (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const reviewId = parseInt(req.params["reviewId"]!);
  const userId = req.user!.id;
  const { rating, comment } = req.body;

  const review = sqlite.prepare(
    "SELECT id, reviewer_id FROM dorm_reviews WHERE id = ? AND dorm_id = ?"
  ).get(reviewId, dormId) as any;

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (review.reviewer_id !== userId) {
    res.status(403).json({ error: "You can only edit your own reviews" });
    return;
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  sqlite.prepare(
    "UPDATE dorm_reviews SET rating = COALESCE(?, rating), comment = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(rating ?? null, comment?.trim() ?? null, reviewId);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM dorm_reviews WHERE dorm_id = ?"
  ).get(dormId) as any;
  sqlite.prepare(
    "UPDATE dorms SET average_rating = ?, total_reviews = ? WHERE id = ?"
  ).run(stats.avg, stats.count, dormId);

  res.json({ success: true });
});

router.delete("/dorms/:dormId/reviews/:reviewId", requireAuth, (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const reviewId = parseInt(req.params["reviewId"]!);
  const userId = req.user!.id;

  const review = sqlite.prepare(
    "SELECT id, reviewer_id FROM dorm_reviews WHERE id = ? AND dorm_id = ?"
  ).get(reviewId, dormId) as any;

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (review.reviewer_id !== userId) {
    res.status(403).json({ error: "You can only delete your own reviews" });
    return;
  }

  sqlite.prepare("DELETE FROM dorm_reviews WHERE id = ?").run(reviewId);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM dorm_reviews WHERE dorm_id = ?"
  ).get(dormId) as any;
  sqlite.prepare(
    "UPDATE dorms SET average_rating = ?, total_reviews = ? WHERE id = ?"
  ).run(stats.avg ?? null, stats.count, dormId);

  res.json({ success: true });
});

// ─── EDIT / DELETE USER REVIEW ────────────────────────────────────────────────

router.patch("/users/:userId/reviews/:reviewId", requireAuth, (req, res) => {
  const targetUserId = parseInt(req.params["userId"]!);
  const reviewId = parseInt(req.params["reviewId"]!);
  const reviewerId = req.user!.id;
  const { rating, comment } = req.body;

  const review = sqlite.prepare(
    "SELECT id, reviewer_id FROM user_reviews WHERE id = ? AND reviewed_user_id = ?"
  ).get(reviewId, targetUserId) as any;

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (review.reviewer_id !== reviewerId) {
    res.status(403).json({ error: "You can only edit your own reviews" });
    return;
  }
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  sqlite.prepare(
    "UPDATE user_reviews SET rating = COALESCE(?, rating), comment = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(rating ?? null, comment?.trim() ?? null, reviewId);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM user_reviews WHERE reviewed_user_id = ?"
  ).get(targetUserId) as any;
  try {
    sqlite.prepare(
      "UPDATE users SET average_rating = ?, total_reviews = ? WHERE id = ?"
    ).run(stats.avg ?? null, stats.count, targetUserId);
  } catch { /* column might not exist */ }

  res.json({ success: true });
});

router.delete("/users/:userId/reviews/:reviewId", requireAuth, (req, res) => {
  const targetUserId = parseInt(req.params["userId"]!);
  const reviewId = parseInt(req.params["reviewId"]!);
  const reviewerId = req.user!.id;

  const review = sqlite.prepare(
    "SELECT id, reviewer_id FROM user_reviews WHERE id = ? AND reviewed_user_id = ?"
  ).get(reviewId, targetUserId) as any;

  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  if (review.reviewer_id !== reviewerId) {
    res.status(403).json({ error: "You can only delete your own reviews" });
    return;
  }

  sqlite.prepare("DELETE FROM user_reviews WHERE id = ?").run(reviewId);

  const stats = sqlite.prepare(
    "SELECT ROUND(AVG(rating), 1) as avg, COUNT(*) as count FROM user_reviews WHERE reviewed_user_id = ?"
  ).get(targetUserId) as any;
  try {
    sqlite.prepare(
      "UPDATE users SET average_rating = ?, total_reviews = ? WHERE id = ?"
    ).run(stats.avg ?? null, stats.count, targetUserId);
  } catch { /* column might not exist */ }

  res.json({ success: true });
});

// ─── MY REVIEWS (current user) ────────────────────────────────────────────────

router.get("/reviews/my-sent", requireAuth, (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  if (role === "student") {
    const rows = (sqlite.prepare(`
      SELECT dr.id, dr.rating, dr.comment, dr.created_at,
             d.id as dorm_id, d.name as dorm_name, d.cover_photo_url
      FROM dorm_reviews dr
      JOIN dorms d ON dr.dorm_id = d.id
      WHERE dr.reviewer_id = ?
      ORDER BY dr.created_at DESC
    `).all(userId) as any[]);
    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.created_at,
        dorm: { id: r.dorm_id, name: r.dorm_name, coverPhotoUrl: r.cover_photo_url ?? null },
      })),
    });
  } else if (role === "owner") {
    const rows = (sqlite.prepare(`
      SELECT ur.id, ur.rating, ur.comment, ur.created_at,
             u.id as student_id, u.full_name as student_name, u.avatar_url as student_avatar,
             u.verification_status
      FROM user_reviews ur
      JOIN users u ON ur.reviewed_user_id = u.id
      WHERE ur.reviewer_id = ?
      ORDER BY ur.created_at DESC
    `).all(userId) as any[]);
    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.created_at,
        student: {
          id: r.student_id,
          fullName: r.student_name,
          avatarUrl: r.student_avatar ?? null,
          verificationStatus: r.verification_status,
        },
      })),
    });
  } else {
    res.json({ reviews: [] });
  }
});

router.get("/reviews/my-received", requireAuth, (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  if (role === "student") {
    const rows = (sqlite.prepare(`
      SELECT ur.id, ur.rating, ur.comment, ur.created_at,
             u.id as reviewer_id, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM user_reviews ur
      JOIN users u ON ur.reviewer_id = u.id
      WHERE ur.reviewed_user_id = ?
      ORDER BY ur.created_at DESC
    `).all(userId) as any[]);
    res.json({
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.created_at,
        reviewer: { id: r.reviewer_id, fullName: r.reviewer_name, avatarUrl: r.reviewer_avatar ?? null },
      })),
    });
  } else if (role === "owner") {
    // Group dorm reviews by listing
    const rows = (sqlite.prepare(`
      SELECT dr.id, dr.rating, dr.comment, dr.created_at,
             d.id as dorm_id, d.name as dorm_name, d.cover_photo_url, d.address,
             u.id as reviewer_id, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM dorm_reviews dr
      JOIN dorms d ON dr.dorm_id = d.id
      JOIN users u ON dr.reviewer_id = u.id
      WHERE d.owner_id = ?
      ORDER BY d.id ASC, dr.created_at DESC
    `).all(userId) as any[]);

    const dormMap = new Map<number, any>();
    for (const r of rows) {
      if (!dormMap.has(r.dorm_id)) {
        dormMap.set(r.dorm_id, {
          dorm: { id: r.dorm_id, name: r.dorm_name, coverPhotoUrl: r.cover_photo_url ?? null, address: r.address },
          reviews: [],
          average: 0,
        });
      }
      dormMap.get(r.dorm_id).reviews.push({
        id: r.id,
        rating: r.rating,
        comment: r.comment ?? null,
        createdAt: r.created_at,
        reviewer: { id: r.reviewer_id, fullName: r.reviewer_name, avatarUrl: r.reviewer_avatar ?? null },
      });
    }

    const listings = Array.from(dormMap.values()).map((entry) => {
      const avg = entry.reviews.length > 0
        ? Math.round((entry.reviews.reduce((s: number, r: any) => s + r.rating, 0) / entry.reviews.length) * 10) / 10
        : null;
      return { ...entry, average: avg };
    });

    res.json({ listings });
  } else {
    res.json({ reviews: [] });
  }
});

export default router;
