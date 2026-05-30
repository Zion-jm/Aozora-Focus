import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { fullName, email, phone, password, role } = req.body;

  if (!fullName || !password || !role) {
    res.status(400).json({ error: "Validation error", message: "fullName, password, and role are required" });
    return;
  }

  if (!email && !phone) {
    res.status(400).json({ error: "Validation error", message: "Either email or phone is required" });
    return;
  }

  if (!["student", "owner"].includes(role)) {
    res.status(400).json({ error: "Validation error", message: "Role must be student or owner" });
    return;
  }

  const conditions = [];
  if (email) conditions.push(eq(users.email, email));
  if (phone) conditions.push(eq(users.phone, phone));

  const existing = await db.select().from(users).where(or(...conditions)).get();
  if (existing) {
    res.status(400).json({ error: "Validation error", message: "Email or phone already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.insert(users).values({
    fullName,
    email: email ?? null,
    phone: phone ?? null,
    passwordHash,
    role,
    verificationStatus: "unverified",
    isSuspended: false,
  }).returning();

  const user = result[0]!;
  const token = generateToken(user.id);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      verificationStatus: user.verificationStatus,
      isSuspended: user.isSuspended,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: "Validation error", message: "identifier and password are required" });
    return;
  }

  const user = await db.select().from(users).where(
    or(eq(users.email, identifier), eq(users.phone, identifier))
  ).get();

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  if (user.isSuspended) {
    res.status(403).json({ error: "Forbidden", message: "Account suspended" });
    return;
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      verificationStatus: user.verificationStatus,
      isSuspended: user.isSuspended,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.user!);
});

export default router;
