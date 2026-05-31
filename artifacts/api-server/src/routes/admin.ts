import { Router } from "express";
import { db } from "../db/index";
import { users, verificationRecords, dorms, appointments } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
  const allUsers = await db.select().from(users).all();
  const allDorms = await db.select().from(dorms).all();
  const allAppts = await db.select().from(appointments).all();
  const allVerifs = await db.select().from(verificationRecords).all();

  const { sqlite } = await import("../db/index");
  const pendingReports = (sqlite.prepare("SELECT COUNT(*) as cnt FROM reports WHERE status = 'pending'").get() as any)?.cnt ?? 0;
  const pendingSupportTickets = (sqlite.prepare("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'pending'").get() as any)?.cnt ?? 0;

  res.json({
    totalUsers: allUsers.length,
    totalStudents: allUsers.filter((u) => u.role === "student").length,
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
  } else if (status === "rejected") {
    await db.update(users).set({ verificationStatus: "rejected" }).where(eq(users.id, verif.userId));
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
  res.json({ ...dorm, amenities: JSON.parse(dorm.amenities || "[]") });
});

export default router;
