import { Router } from "express";
import { db } from "../db/index";
import { users, verificationRecords } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.put("/users/me", requireAuth, async (req, res) => {
  const { fullName, phone, avatarUrl } = req.body;
  const userId = req.user!.id;

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (fullName) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

  const result = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
  const user = result[0]!;

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

router.post("/users/me/submit-verification", requireAuth, async (req, res) => {
  const { idImageUrl, idType } = req.body;
  const userId = req.user!.id;

  if (!idImageUrl || !idType) {
    res.status(400).json({ error: "Validation error", message: "idImageUrl and idType are required" });
    return;
  }

  const result = await db.insert(verificationRecords).values({
    userId,
    idImageUrl,
    idType,
    status: "pending",
  }).returning();

  await db.update(users).set({ verificationStatus: "pending" }).where(eq(users.id, userId));

  res.status(201).json(result[0]);
});

router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params["userId"]!);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    verificationStatus: user.verificationStatus,
    avatarUrl: user.avatarUrl,
  });
});

export default router;
