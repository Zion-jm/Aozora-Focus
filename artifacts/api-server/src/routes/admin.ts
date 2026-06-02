import { Router } from "express";
import { db, sqlite } from "../db/index";
import { users, verificationRecords, dorms, appointments } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser } from "../lib/notifications";

const SEVERITY_POINTS: Record<number, number> = { 1: 1, 2: 3, 3: 6, 4: 10 };

function computeScore(violRows: any[]): number {
  const now = Date.now();
  return violRows.reduce((sum, v) => {
    const ageDays = (now - new Date(v.created_at).getTime()) / 86400000;
    const weight = ageDays <= 30 ? 1.5 : ageDays <= 90 ? 1.0 : ageDays <= 180 ? 0.75 : 0.5;
    return sum + (SEVERITY_POINTS[v.severity as number] ?? 1) * weight;
  }, 0);
}

function scoreToLevel(score: number): string {
  if (score <= 0) return "clean";
  if (score < 5)  return "warning";
  if (score < 10) return "short_suspension";
  if (score < 20) return "long_suspension";
  return "ban";
}

const CATEGORY_LABELS: Record<string, string> = {
  harassment:           "Harassment or Bullying",
  spam:                 "Spam or Unsolicited Messages",
  fake_listing:         "Fraudulent Dorm Listing",
  fake_identity:        "Identity Misrepresentation",
  hate_speech:          "Hate Speech or Discrimination",
  inappropriate_content:"Inappropriate Content",
  no_show:              "Repeated Appointment No-Shows",
  other:                "Other Violation",
};

const router = Router();

router.get("/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
  const allUsers = await db.select().from(users).all();
  const allDorms = await db.select().from(dorms).all();
  const allAppts = await db.select().from(appointments).all();
  const allVerifs = await db.select().from(verificationRecords).all();

  const pendingReports = (sqlite.prepare("SELECT COUNT(*) as cnt FROM reports WHERE status = 'pending'").get() as any)?.cnt ?? 0;
  const pendingSupportTickets = (sqlite.prepare("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'pending'").get() as any)?.cnt ?? 0;
  const totalViolations = (sqlite.prepare("SELECT COUNT(*) as cnt FROM violations").get() as any)?.cnt ?? 0;
  const recentViolations = (sqlite.prepare("SELECT COUNT(*) as cnt FROM violations WHERE created_at >= datetime('now', '-7 days')").get() as any)?.cnt ?? 0;

  res.json({
    totalUsers: allUsers.length,
    totalBoarders: allUsers.filter((u) => u.role === "boarder").length,
    totalOwners: allUsers.filter((u) => u.role === "owner").length,
    suspendedUsers: allUsers.filter((u) => u.isSuspended).length,
    pendingVerifications: allVerifs.filter((v) => v.status === "pending").length,
    totalDorms: allDorms.length,
    pendingDorms: allDorms.filter((d) => d.status === "pending").length,
    approvedDorms: allDorms.filter((d) => d.status === "approved").length,
    takenDownDorms: allDorms.filter((d) => d.status === "taken_down").length,
    totalAppointments: allAppts.length,
    pendingAppointments: allAppts.filter((a) => a.status === "pending").length,
    pendingReports,
    pendingSupportTickets,
    totalViolations,
    recentViolations,
  });
});

router.get("/admin/users/:userId", requireAuth, requireRole("admin"), async (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  const verifs = await db
    .select()
    .from(verificationRecords)
    .where(eq(verificationRecords.userId, userId))
    .all();

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    verificationStatus: user.verificationStatus,
    isSuspended: user.isSuspended,
    avatarUrl: user.avatarUrl,
    birthday: user.birthday ?? null,
    universityOrWorkplace: user.universityOrWorkplace ?? null,
    emergencyContactName: user.emergencyContactName ?? null,
    emergencyContactPhone: user.emergencyContactPhone ?? null,
    bio: user.bio ?? null,
    createdAt: user.createdAt,
    verificationRecords: verifs,
  });
});

router.get("/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { role, verificationStatus, page = "1" } = req.query as Record<string, string>;
  let allUsers = await db.select().from(users).all();

  if (role) allUsers = allUsers.filter((u) => u.role === role);
  if (verificationStatus) allUsers = allUsers.filter((u) => u.verificationStatus === verificationStatus);

  const pageNum = parseInt(page);
  const limit = 20;
  const total = allUsers.length;
  const paginated = allUsers.slice((pageNum - 1) * limit, pageNum * limit);

  res.json({
    users: paginated.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      verificationStatus: u.verificationStatus,
      isSuspended: u.isSuspended,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limit),
  });
});

router.put("/admin/users/:userId/status", requireAuth, requireRole("admin"), async (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const { isSuspended } = req.body;

  const result = await db.update(users).set({
    isSuspended: isSuspended,
    updatedAt: new Date().toISOString(),
  }).where(eq(users.id, userId)).returning();

  const user = result[0];
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  notifyUser(sqlite, userId, {
    type: isSuspended ? "user_suspended" : "user_unsuspended",
    title: isSuspended ? "Account Suspended" : "Account Reinstated",
    body: isSuspended
      ? "Your Aozora account has been suspended. Contact support if you believe this is a mistake."
      : "Your Aozora account has been reinstated. Welcome back!",
    data: { path: "/(tabs)/profile" },
  });

  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    verificationStatus: user.verificationStatus,
    isSuspended: user.isSuspended,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
});

router.get("/admin/verifications", requireAuth, requireRole("admin"), async (_req, res) => {
  const verifs = await db.select().from(verificationRecords).all();
  const allUsers = await db.select().from(users).all();
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));

  res.json({
    verifications: verifs.map((v) => {
      const u = userMap[v.userId];
      return {
        ...v,
        user: u
          ? { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl }
          : null,
      };
    }),
    total: verifs.length,
  });
});

router.put("/admin/verifications/:verificationId", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params["verificationId"]!);
  const { status, reviewNote } = req.body;

  const result = await db.update(verificationRecords).set({
    status,
    reviewNote: reviewNote ?? null,
    reviewedAt: new Date().toISOString(),
  }).where(eq(verificationRecords.id, id)).returning();

  const verif = result[0];
  if (!verif) {
    res.status(404).json({ error: "Not found", message: "Verification record not found" });
    return;
  }

  if (status === "approved") {
    await db.update(users).set({ verificationStatus: "verified" }).where(eq(users.id, verif.userId));
    notifyUser(sqlite, verif.userId, {
      type: "verification_approved",
      title: "ID Verified ✅",
      body: "Your identity has been verified. You now have full access to all Aozora features.",
      data: { path: "/(tabs)/profile" },
    });
  } else if (status === "rejected") {
    await db.update(users).set({ verificationStatus: "rejected" }).where(eq(users.id, verif.userId));
    notifyUser(sqlite, verif.userId, {
      type: "verification_rejected",
      title: "ID Verification Failed",
      body: `Your ID verification was not approved.${reviewNote ? ` Reason: ${reviewNote}` : " Please resubmit with a clearer photo."}`,
      data: { path: "/(tabs)/profile" },
    });
  }

  const u = await db.select().from(users).where(eq(users.id, verif.userId)).get();
  res.json({
    ...verif,
    user: u ? { id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, avatarUrl: u.avatarUrl } : null,
  });
});

router.get("/admin/dorms", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query as Record<string, string>;
  let allDorms = await db.select().from(dorms).all();

  if (status) allDorms = allDorms.filter((d) => d.status === status);

  res.json({
    dorms: allDorms.map((d) => ({ ...d, amenities: JSON.parse(d.amenities || "[]") })),
    total: allDorms.length,
    page: 1,
    totalPages: 1,
  });
});

router.put("/admin/dorms/:dormId/status", requireAuth, requireRole("admin"), async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const { status, note } = req.body;

  const result = await db.update(dorms).set({
    status,
    adminNote: note ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(dorms.id, dormId)).returning();

  const dorm = result[0]!;

  const notifType =
    status === "approved" ? "dorm_approved" :
    status === "rejected" ? "dorm_rejected" : "dorm_taken_down";
  const notifTitle =
    status === "approved" ? "Listing Approved ✅" :
    status === "rejected" ? "Listing Rejected" : "Listing Taken Down";
  const notifBody =
    status === "approved"
      ? `Your listing "${dorm.name}" has been approved and is now live!`
      : status === "rejected"
      ? `Your listing "${dorm.name}" was not approved.${note ? ` Reason: ${note}` : ""}`
      : `Your listing "${dorm.name}" has been taken down.${note ? ` Reason: ${note}` : ""}`;

  notifyUser(sqlite, dorm.ownerId, {
    type: notifType,
    title: notifTitle,
    body: notifBody,
    data: { path: `/dorm/${dorm.id}` },
  });

  res.json({ ...dorm, amenities: JSON.parse(dorm.amenities || "[]") });
});

router.get("/admin/violations", requireAuth, requireRole("admin"), async (_req, res) => {
  const rows = sqlite.prepare(`
    SELECT v.*,
      u.full_name as user_name, u.avatar_url as user_avatar,
      a.full_name as admin_name
    FROM violations v
    LEFT JOIN users u ON v.user_id = u.id
    LEFT JOIN users a ON v.admin_id = a.id
    ORDER BY v.created_at DESC
  `).all() as any[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const levelMap: Record<number, string> = {};
  for (const uid of userIds) {
    const userViolations = rows.filter((r) => r.user_id === uid);
    levelMap[uid] = scoreToLevel(computeScore(userViolations));
  }

  const violations = rows.map((r) => ({ ...r, level: levelMap[r.user_id] ?? "clean" }));

  const bySeverity: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  rows.forEach((r) => { bySeverity[r.severity as number] = (bySeverity[r.severity as number] ?? 0) + 1; });

  res.json({
    violations,
    stats: { total: rows.length, bySeverity },
  });
});

router.get("/admin/users/:userId/violations", requireAuth, requireRole("admin"), async (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const rows = sqlite.prepare(`
    SELECT v.*, a.full_name as admin_name
    FROM violations v
    LEFT JOIN users a ON v.admin_id = a.id
    WHERE v.user_id = ?
    ORDER BY v.created_at DESC
  `).all(userId) as any[];

  const score = computeScore(rows);
  const level = scoreToLevel(score);
  res.json({ violations: rows, score, level });
});

router.post("/admin/violations", requireAuth, requireRole("admin"), async (req, res) => {
  const adminId = (req as any).user!.id;
  const { userId, category, severity, description, notes } = req.body;

  if (!userId || !category || !severity || !description) {
    res.status(400).json({ error: "Bad request", message: "userId, category, severity, and description are required." });
    return;
  }

  const result = sqlite.prepare(
    `INSERT INTO violations (user_id, admin_id, category, severity, description, notes) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(userId, adminId, category, severity, description, notes ?? null) as any;

  const categoryLabel = CATEGORY_LABELS[category as string] ?? category;
  notifyUser(sqlite, userId, {
    type: "violation_logged",
    title: "Community Guideline Violation",
    body: `A violation has been recorded on your account: ${categoryLabel}. Repeated violations may result in suspension.`,
    data: { path: "/(tabs)/profile" },
  });

  const allViolations = sqlite.prepare(
    `SELECT * FROM violations WHERE user_id = ?`
  ).all(userId) as any[];
  const score = computeScore(allViolations);
  const level = scoreToLevel(score);

  res.json({ id: result.lastInsertRowid, score, level });
});

router.delete("/admin/violations/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = parseInt(req.params["id"]!);
  sqlite.prepare("DELETE FROM violations WHERE id = ?").run(id);
  res.json({ success: true });
});

router.post("/admin/violations/apply-recommendation", requireAuth, requireRole("admin"), async (req, res) => {
  const { userId, level } = req.body;

  if (level === "clean") {
    res.json({ success: true, action: "none" });
    return;
  }

  const notifMap: Record<string, { title: string; body: string }> = {
    warning: {
      title: "Official Warning",
      body: "You have received an official warning from Aozora administration due to community guideline violations.",
    },
    short_suspension: {
      title: "Account Suspended (7 Days)",
      body: "Due to repeated community guideline violations, your account has been suspended for 7 days.",
    },
    long_suspension: {
      title: "Account Suspended (30 Days)",
      body: "Due to serious community guideline violations, your account has been suspended for 30 days.",
    },
    ban: {
      title: "Account Permanently Banned",
      body: "Your account has been permanently banned from Aozora due to severe or repeated community guideline violations.",
    },
  };

  if (level === "short_suspension" || level === "long_suspension" || level === "ban") {
    await db.update(users).set({ isSuspended: true, updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
  }

  const notif = notifMap[level as string];
  if (notif) {
    notifyUser(sqlite, userId, {
      type: `violation_action_${level}`,
      title: notif.title,
      body: notif.body,
      data: { path: "/(tabs)/profile" },
    });
  }

  res.json({ success: true, action: level });
});

router.get("/admin/activity", requireAuth, requireRole("admin"), async (_req, res) => {
  const recentUsers = sqlite.prepare(
    `SELECT full_name as actor, role, created_at as at FROM users ORDER BY created_at DESC LIMIT 6`
  ).all() as any[];

  const recentDorms = sqlite.prepare(
    `SELECT d.name as actor, u.full_name as owner_name, d.created_at as at
     FROM dorms d LEFT JOIN users u ON d.owner_id = u.id
     ORDER BY d.created_at DESC LIMIT 6`
  ).all() as any[];

  const recentAppts = sqlite.prepare(
    `SELECT u.full_name as student_name, dm.name as dorm_name, a.created_at as at
     FROM appointments a
     LEFT JOIN users u ON a.student_id = u.id
     LEFT JOIN dorms dm ON a.dorm_id = dm.id
     ORDER BY a.created_at DESC LIMIT 6`
  ).all() as any[];

  const recentReports = sqlite.prepare(
    `SELECT u.full_name as reporter_name, r.reason, r.created_at as at
     FROM reports r LEFT JOIN users u ON r.reporter_id = u.id
     ORDER BY r.created_at DESC LIMIT 6`
  ).all() as any[];

  type ActivityItem = { type: string; label: string; at: string };

  const all: ActivityItem[] = [
    ...recentUsers.map((r) => ({
      type: "user",
      label: `${r.actor} joined as ${r.role}`,
      at: r.at,
    })),
    ...recentDorms.map((r) => ({
      type: "dorm",
      label: `"${r.actor}" submitted by ${r.owner_name ?? "—"}`,
      at: r.at,
    })),
    ...recentAppts.map((r) => ({
      type: "appointment",
      label: `${r.student_name ?? "A student"} booked a visit at ${r.dorm_name ?? "a dorm"}`,
      at: r.at,
    })),
    ...recentReports.map((r) => ({
      type: "report",
      label: `Report by ${r.reporter_name ?? "Unknown"}: ${r.reason}`,
      at: r.at,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  res.json({ activity: all });
});

export default router;
