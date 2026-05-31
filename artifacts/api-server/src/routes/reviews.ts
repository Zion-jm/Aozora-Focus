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

export default router;
