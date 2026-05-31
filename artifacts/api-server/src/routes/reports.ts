import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const VALID_REASONS = [
  "Scam or Fraud",
  "Harassment",
  "Threats or Violence",
  "Fake Listing or Profile",
  "Unethical Behavior",
  "Spam",
  "Inappropriate Content",
  "Other",
];

const VALID_TARGET_TYPES = ["user", "dorm", "review"];

router.post("/reports", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { targetType, targetId, reason, details } = req.body;

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    res.status(400).json({ error: "Invalid target type" });
    return;
  }

  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason. Must be one of the listed options." });
    return;
  }

  if (!targetId || typeof targetId !== "number") {
    res.status(400).json({ error: "targetId must be a number" });
    return;
  }

  if (targetType === "user" && targetId === user.id) {
    res.status(400).json({ error: "You cannot report yourself." });
    return;
  }

  const existing = sqlite
    .prepare(
      "SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'"
    )
    .get(user.id, targetType, targetId);

  if (existing) {
    res.status(409).json({
      error: "You already have a pending report for this. Our team is reviewing it.",
    });
    return;
  }

  sqlite
    .prepare(
      "INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)"
    )
    .run(user.id, targetType, targetId, reason, details?.trim() || null);

  res.status(201).json({
    success: true,
    message: "Your report has been submitted. Thank you for helping keep Aozora safe.",
  });
});

router.get("/admin/reports", requireAuth, requireRole("admin"), (req, res) => {
  const { status } = req.query as { status?: string };

  let query = `
    SELECT
      r.id, r.target_type, r.target_id, r.reason, r.details,
      r.status, r.admin_note, r.created_at, r.updated_at,
      u.id   AS reporter_id,
      u.full_name AS reporter_name,
      u.email AS reporter_email
    FROM reports r
    LEFT JOIN users u ON r.reporter_id = u.id
  `;

  const params: any[] = [];
  if (status && ["pending", "reviewed", "dismissed"].includes(status)) {
    query += " WHERE r.status = ?";
    params.push(status);
  }
  query += " ORDER BY r.created_at DESC";

  const rows = sqlite.prepare(query).all(...params);
  res.json({ reports: rows, total: rows.length });
});

router.patch("/admin/reports/:id", requireAuth, requireRole("admin"), (req, res) => {
  const reportId = parseInt(req.params["id"]!);
  const { status, adminNote } = req.body;

  if (!["pending", "reviewed", "dismissed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const report = sqlite.prepare("SELECT id FROM reports WHERE id = ?").get(reportId);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  sqlite
    .prepare(
      "UPDATE reports SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .run(status, adminNote?.trim() || null, reportId);

  res.json({ success: true });
});

export default router;
