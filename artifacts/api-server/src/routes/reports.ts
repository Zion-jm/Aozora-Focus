import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser, notifyAllAdmins } from "../lib/notifications";

const router = Router();

function resolveTargetUserId(targetType: string, targetId: number): number | null {
  if (targetType === "user") return targetId;
  if (targetType === "dorm") {
    const dorm = sqlite.prepare("SELECT owner_id FROM dorms WHERE id = ?").get(targetId) as any;
    return dorm?.owner_id ?? null;
  }
  if (targetType === "review") {
    const dr = sqlite.prepare("SELECT reviewer_id FROM dorm_reviews WHERE id = ?").get(targetId) as any;
    if (dr) return dr.reviewer_id;
    const ur = sqlite.prepare("SELECT reviewer_id FROM user_reviews WHERE id = ?").get(targetId) as any;
    return ur?.reviewer_id ?? null;
  }
  return null;
}

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

  if (targetType === "dorm") {
    const dorm = sqlite.prepare("SELECT owner_id FROM dorms WHERE id = ?").get(targetId) as any;
    if (!dorm) {
      res.status(404).json({ error: "Dorm not found." });
      return;
    }
    if (dorm.owner_id === user.id) {
      res.status(400).json({ error: "You cannot report your own listing." });
      return;
    }
  }

  if (targetType === "review") {
    const dr = sqlite.prepare("SELECT reviewer_id FROM dorm_reviews WHERE id = ?").get(targetId) as any;
    const ur = dr ? null : (sqlite.prepare("SELECT reviewer_id FROM user_reviews WHERE id = ?").get(targetId) as any);
    const reviewerId = dr?.reviewer_id ?? ur?.reviewer_id ?? null;
    if (reviewerId === null) {
      res.status(404).json({ error: "Review not found." });
      return;
    }
    if (reviewerId === user.id) {
      res.status(400).json({ error: "You cannot report your own review." });
      return;
    }
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

  notifyAllAdmins(sqlite, {
    type: "report_new",
    title: "New Report Filed 🚩",
    body: `A new report was filed: ${reason}.`,
    data: { path: "/admin/reports" },
  });

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
      r.warned_at, r.taken_down_at,
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

  const rows = sqlite.prepare(query).all(...params) as any[];

  const enriched = rows.map((row) => {
    const userId = resolveTargetUserId(row.target_type, row.target_id);
    const targetUser = userId
      ? (sqlite.prepare("SELECT id, full_name FROM users WHERE id = ?").get(userId) as any)
      : null;
    const targetDorm = row.target_type === "dorm"
      ? (sqlite.prepare("SELECT id, name, status FROM dorms WHERE id = ?").get(row.target_id) as any)
      : null;
    return {
      ...row,
      target_user_id: targetUser?.id ?? null,
      target_user_name: targetUser?.full_name ?? null,
      target_dorm_name: targetDorm?.name ?? null,
      target_dorm_status: targetDorm?.status ?? null,
    };
  });

  res.json({ reports: enriched, total: enriched.length });
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

router.get("/admin/users/:userId/warnings", requireAuth, requireRole("admin"), (req, res) => {
  const userId = parseInt(req.params["userId"]!);

  const allWarned = sqlite.prepare(`
    SELECT
      r.id, r.target_type, r.target_id, r.reason, r.details,
      r.status, r.warned_at, r.created_at,
      u.full_name AS reporter_name
    FROM reports r
    LEFT JOIN users u ON r.reporter_id = u.id
    WHERE r.warned_at IS NOT NULL
    ORDER BY r.warned_at DESC
  `).all() as any[];

  const warnings = allWarned.filter((row) => {
    const resolved = resolveTargetUserId(row.target_type, row.target_id);
    return resolved === userId;
  });

  res.json({ warnings, total: warnings.length });
});

router.post("/admin/reports/:id/warn", requireAuth, requireRole("admin"), (req, res) => {
  const reportId = parseInt(req.params["id"]!);
  const adminId = (req as any).user.id;

  const report = sqlite
    .prepare("SELECT * FROM reports WHERE id = ?")
    .get(reportId) as any;
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const targetUserId = resolveTargetUserId(report.target_type, report.target_id);
  if (!targetUserId) {
    res.status(422).json({ error: "Could not resolve target user for this report" });
    return;
  }

  const targetUser = sqlite
    .prepare("SELECT id, full_name FROM users WHERE id = ?")
    .get(targetUserId) as any;
  if (!targetUser) {
    res.status(404).json({ error: "Target user not found" });
    return;
  }

  let conv = sqlite
    .prepare("SELECT * FROM admin_conversations WHERE admin_id = ? AND user_id = ?")
    .get(adminId, targetUserId) as any;

  if (!conv) {
    const result = sqlite
      .prepare("INSERT INTO admin_conversations (admin_id, user_id) VALUES (?, ?)")
      .run(adminId, targetUserId);
    conv = sqlite
      .prepare("SELECT * FROM admin_conversations WHERE id = ?")
      .get(result.lastInsertRowid) as any;
  } else {
    sqlite
      .prepare("UPDATE admin_conversations SET admin_deleted_at = NULL WHERE id = ?")
      .run(conv.id);
  }

  const detailLine = report.details ? `\nDetails: "${report.details}"` : "";
  const warningMessage =
    `⚠️ Official Warning from Aozora Admin\n\n` +
    `We have reviewed a report filed against your account and found a violation of our community guidelines.\n\n` +
    `Violation: ${report.reason}${detailLine}\n\n` +
    `Please take note that repeated violations may result in permanent account suspension. ` +
    `If you believe this warning was issued in error, please reply to this message to appeal.`;

  const msgResult = sqlite
    .prepare(
      "INSERT INTO admin_messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, 0)"
    )
    .run(conv.id, adminId, warningMessage);

  sqlite
    .prepare("UPDATE admin_conversations SET updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), conv.id);

  sqlite
    .prepare(
      "UPDATE reports SET status = 'reviewed', warned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .run(reportId);

  const msg = sqlite
    .prepare("SELECT * FROM admin_messages WHERE id = ?")
    .get(msgResult.lastInsertRowid) as any;

  notifyUser(sqlite, targetUserId, {
    type: "admin_warning",
    title: "⚠️ Official Warning",
    body: `You received an official warning regarding: ${report.reason}. Tap to view the message.`,
    data: { path: `/admin-conversation/${conv.id}` },
  });

  res.status(201).json({
    conversationId: conv.id,
    targetUserId,
    targetUserName: targetUser.full_name,
    message: {
      id: msg.id,
      content: msg.content,
      createdAt: msg.created_at,
    },
  });
});

router.post("/admin/reports/:id/takedown", requireAuth, requireRole("admin"), (req, res) => {
  const reportId = parseInt(req.params["id"]!);

  const report = sqlite
    .prepare("SELECT * FROM reports WHERE id = ?")
    .get(reportId) as any;
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (report.target_type !== "dorm") {
    res.status(400).json({ error: "This action is only valid for dorm reports" });
    return;
  }

  if (report.taken_down_at) {
    res.status(409).json({ error: "Listing has already been taken down from this report" });
    return;
  }

  const dorm = sqlite
    .prepare("SELECT id, name, status, owner_id FROM dorms WHERE id = ?")
    .get(report.target_id) as any;
  if (!dorm) {
    res.status(404).json({ error: "Dorm not found" });
    return;
  }

  const ownerId = sqlite.prepare("SELECT owner_id FROM dorms WHERE id = ?").get(dorm.id) as any;

  sqlite
    .prepare("UPDATE dorms SET status = 'taken_down', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), dorm.id);

  sqlite
    .prepare(
      "UPDATE reports SET status = 'reviewed', taken_down_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .run(reportId);

  if (dorm.owner_id) {
    notifyUser(sqlite, dorm.owner_id, {
      type: "dorm_taken_down",
      title: "Listing Taken Down",
      body: `Your listing "${dorm.name}" has been taken down due to a reported violation.`,
      data: { path: `/dorm/${dorm.id}` },
    });
  }

  res.json({
    dormId: dorm.id,
    dormName: dorm.name,
    takenDown: true,
  });
});

router.post("/admin/reports/:id/suspend", requireAuth, requireRole("admin"), (req, res) => {
  const reportId = parseInt(req.params["id"]!);

  const report = sqlite
    .prepare("SELECT * FROM reports WHERE id = ?")
    .get(reportId) as any;
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  const targetUserId = resolveTargetUserId(report.target_type, report.target_id);
  if (!targetUserId) {
    res.status(422).json({ error: "Could not resolve target user for this report" });
    return;
  }

  const targetUser = sqlite
    .prepare("SELECT id, full_name, role FROM users WHERE id = ?")
    .get(targetUserId) as any;
  if (!targetUser) {
    res.status(404).json({ error: "Target user not found" });
    return;
  }

  if (targetUser.role === "admin") {
    res.status(403).json({ error: "Cannot suspend an admin account" });
    return;
  }

  sqlite
    .prepare("UPDATE users SET is_suspended = 1, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), targetUserId);

  sqlite
    .prepare(
      "UPDATE reports SET status = 'reviewed', updated_at = datetime('now') WHERE id = ?"
    )
    .run(reportId);

  notifyUser(sqlite, targetUserId, {
    type: "user_suspended",
    title: "Account Suspended",
    body: "Your Aozora account has been suspended due to a reported violation. Contact support to appeal.",
    data: { path: "/(tabs)/profile" },
  });

  res.json({
    targetUserId,
    targetUserName: targetUser.full_name,
    suspended: true,
  });
});

export default router;
