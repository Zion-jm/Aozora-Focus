import { Router } from "express";
import { db, sqlite } from "../db/index";
import { users, verificationRecords } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { notifyAllAdmins } from "../lib/notifications";

const router = Router();

function formatUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    verificationStatus: user.verificationStatus,
    isSuspended: user.isSuspended,
    avatarUrl: user.avatarUrl,
    birthday: user.birthday ?? null,
    gender: user.gender ?? null,
    universityOrWorkplace: user.universityOrWorkplace ?? null,
    emergencyContactName: user.emergencyContactName ?? null,
    emergencyContactPhone: user.emergencyContactPhone ?? null,
    bio: user.bio ?? null,
    phonePublic: user.phonePublic ?? false,
    createdAt: user.createdAt,
  };
}

router.get("/violations/my", requireAuth, async (req, res) => {
  const userId = (req as any).user!.id;
  const rows = sqlite.prepare(`
    SELECT v.id, v.category, v.severity, v.description, v.created_at
    FROM violations v
    WHERE v.user_id = ?
    ORDER BY v.created_at DESC
  `).all(userId) as any[];

  const SEVERITY_POINTS: Record<number, number> = { 1: 1, 2: 3, 3: 6, 4: 10 };
  const now = Date.now();
  const score = rows.reduce((sum: number, v: any) => {
    const ageDays = (now - new Date(v.created_at).getTime()) / 86400000;
    const weight = ageDays <= 30 ? 1.5 : ageDays <= 90 ? 1.0 : ageDays <= 180 ? 0.75 : 0.5;
    return sum + (SEVERITY_POINTS[v.severity as number] ?? 1) * weight;
  }, 0);

  const level =
    score <= 0 ? "clean" :
    score < 5  ? "warning" :
    score < 10 ? "short_suspension" :
    score < 20 ? "long_suspension" : "ban";

  const userRow = sqlite.prepare(
    `SELECT is_suspended, suspended_until FROM users WHERE id = ?`
  ).get(userId) as any;

  res.json({
    violations: rows,
    score,
    level,
    isSuspended: !!userRow?.is_suspended,
    suspendedUntil: userRow?.suspended_until ?? null,
  });
});

router.put("/users/me", requireAuth, async (req, res) => {
  const {
    fullName, phone, avatarUrl,
    birthday, gender, universityOrWorkplace,
    emergencyContactName, emergencyContactPhone, bio,
    phonePublic,
  } = req.body;
  const userId = req.user!.id;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (fullName) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (birthday !== undefined) updates.birthday = birthday;
  if (gender !== undefined) updates.gender = gender;
  if (universityOrWorkplace !== undefined) updates.universityOrWorkplace = universityOrWorkplace;
  if (emergencyContactName !== undefined) updates.emergencyContactName = emergencyContactName;
  if (emergencyContactPhone !== undefined) updates.emergencyContactPhone = emergencyContactPhone;
  if (bio !== undefined) updates.bio = bio;
  if (phonePublic !== undefined) updates.phonePublic = phonePublic ? 1 : 0;

  const result = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
  res.json(formatUser(result[0]!));
});

router.post("/users/me/submit-verification", requireAuth, async (req, res) => {
  const { idImageUrl, idType } = req.body;
  const userId = req.user!.id;

  if (!idImageUrl || !idType) {
    res.status(400).json({ error: "Validation error", message: "idImageUrl and idType are required" });
    return;
  }

  // 24-hour cooldown: block resubmission if last record was rejected within the past 24 hours
  const allRecords = await db
    .select()
    .from(verificationRecords)
    .where(eq(verificationRecords.userId, userId))
    .all();

  if (allRecords.length > 0) {
    const latest = allRecords.sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )[0]!;
    if (latest.status === "rejected") {
      const baseTime = latest.reviewedAt ? new Date(latest.reviewedAt) : new Date(latest.submittedAt);
      const nextAllowedAt = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
      if (new Date() < nextAllowedAt) {
        res.status(429).json({
          error: "Cooldown",
          message: "Please wait before resubmitting.",
          nextAllowedAt: nextAllowedAt.toISOString(),
        });
        return;
      }
    }
  }

  const result = await db.insert(verificationRecords).values({
    userId,
    idImageUrl,
    idType,
    status: "pending",
  }).returning();

  await db.update(users).set({ verificationStatus: "pending" }).where(eq(users.id, userId));

  notifyAllAdmins(sqlite, {
    type: "verification_submitted",
    title: "New ID Verification 🪪",
    body: `${req.user!.fullName} submitted their ID for verification.`,
    data: { path: "/admin/verifications" },
  });

  res.status(201).json(result[0]);
});

router.get("/users/me/verification", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const records = await db
    .select()
    .from(verificationRecords)
    .where(eq(verificationRecords.userId, userId))
    .all();

  if (records.length === 0) {
    res.json(null);
    return;
  }

  const latest = records.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )[0]!;
  res.json(latest);
});

router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const showPhone =
    user.role === "owner" ||
    (user.role === "boarder" && !!user.phonePublic);

  res.json({
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    verificationStatus: user.verificationStatus,
    avatarUrl: user.avatarUrl,
    bio: user.bio ?? null,
    universityOrWorkplace: user.universityOrWorkplace ?? null,
    createdAt: user.createdAt,
    phone: showPhone ? (user.phone ?? null) : null,
    phonePublic: user.phonePublic ?? false,
  });
});

router.put("/users/me/push-token", requireAuth, async (req, res) => {
  const { expoPushToken } = req.body;
  const userId = req.user!.id;

  if (!expoPushToken || typeof expoPushToken !== "string") {
    res.status(400).json({ error: "expoPushToken is required" });
    return;
  }

  sqlite.prepare("UPDATE users SET expo_push_token = ? WHERE id = ?").run(expoPushToken, userId);

  res.json({ message: "Push token registered" });
});

export default router;
