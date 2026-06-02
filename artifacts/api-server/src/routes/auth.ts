import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dns from "dns/promises";
import { db, sqlite } from "../db/index";
import { users } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { generateToken, requireAuth } from "../middlewares/auth";
import { sendOtpEmail } from "../lib/mailer";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function isEmailDomainValid(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1];
    const records = await dns.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

// POST /auth/send-otp — generate and email a 6-digit OTP to the given email address
router.post("/auth/send-otp", async (req, res) => {
  const { contact } = req.body;
  if (!contact || !contact.trim()) {
    res.status(400).json({ error: "Validation error", message: "contact is required" });
    return;
  }

  const normalized = contact.trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    res.status(400).json({ error: "Validation error", message: "Please enter a valid email address (e.g. yourname@gmail.com)." });
    return;
  }

  const domainValid = await isEmailDomainValid(normalized);
  if (!domainValid) {
    res.status(400).json({ error: "Validation error", message: "This email address doesn't look real. Please check and try again." });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, normalized)).get();
  if (existing) {
    res.status(400).json({ error: "Validation error", message: "An account with this email already exists. Please log in instead." });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  sqlite.prepare("DELETE FROM otp_verifications WHERE contact = ? AND is_verified = 0").run(normalized);
  sqlite.prepare(
    "INSERT INTO otp_verifications (contact, code, expires_at) VALUES (?, ?, ?)"
  ).run(normalized, code, expiresAt);

  try {
    await sendOtpEmail(normalized, code);
  } catch (err) {
    console.warn("[send-otp] Email delivery failed — falling back to console log.");
    console.log(`\n====================================`);
    console.log(`  OTP for ${normalized}: ${code}`);
    console.log(`====================================\n`);
  }

  res.json({ message: "Verification code sent" });
});

// POST /auth/verify-otp — validate the code and return a short-lived verificationToken
router.post("/auth/verify-otp", async (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    res.status(400).json({ error: "Validation error", message: "contact and code are required" });
    return;
  }

  const normalized = contact.trim().toLowerCase();

  const otp = sqlite.prepare(
    "SELECT * FROM otp_verifications WHERE contact = ? AND code = ? AND is_verified = 0 ORDER BY created_at DESC LIMIT 1"
  ).get(normalized, code.trim()) as any;

  if (!otp) {
    res.status(400).json({ error: "Invalid code", message: "The code is incorrect or has already been used." });
    return;
  }

  if (new Date(otp.expires_at) < new Date()) {
    res.status(400).json({ error: "Expired code", message: "The verification code has expired. Please request a new one." });
    return;
  }

  const verificationToken = crypto.randomUUID();
  const now = new Date().toISOString();
  sqlite.prepare(
    "UPDATE otp_verifications SET is_verified = 1, verification_token = ?, verified_at = ? WHERE id = ?"
  ).run(verificationToken, now, otp.id);

  res.json({ verificationToken });
});

// POST /auth/register — requires a verificationToken from /auth/verify-otp
router.post("/auth/register", async (req, res) => {
  const { fullName, password, role, verificationToken } = req.body;

  if (!fullName || !password || !role || !verificationToken) {
    res.status(400).json({ error: "Validation error", message: "fullName, password, role, and verificationToken are required" });
    return;
  }

  if (!["boarder", "owner"].includes(role)) {
    res.status(400).json({ error: "Validation error", message: "Role must be boarder or owner" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Password must be at least 8 characters" });
    return;
  }

  const otpRecord = sqlite.prepare(
    "SELECT * FROM otp_verifications WHERE verification_token = ? AND is_verified = 1"
  ).get(verificationToken) as any;

  if (!otpRecord) {
    res.status(400).json({ error: "Validation error", message: "Invalid or expired verification token. Please verify your contact again." });
    return;
  }

  const contact: string = otpRecord.contact;
  const email = contact.includes("@") ? contact : null;

  if (!email) {
    res.status(400).json({ error: "Validation error", message: "Only email contacts are supported." });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    res.status(400).json({ error: "Validation error", message: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.insert(users).values({
    fullName,
    email,
    phone: null,
    passwordHash,
    role,
    verificationStatus: "unverified",
    isSuspended: false,
  }).returning();

  sqlite.prepare("DELETE FROM otp_verifications WHERE verification_token = ?").run(verificationToken);

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

// POST /auth/forgot-password/send-otp — send reset OTP to a registered email
router.post("/auth/forgot-password/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    res.status(400).json({ error: "Validation error", message: "Email is required." });
    return;
  }

  const normalized = email.trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    res.status(400).json({ error: "Validation error", message: "Please enter a valid email address." });
    return;
  }

  const user = await db.select().from(users).where(eq(users.email, normalized)).get();
  if (!user) {
    res.status(400).json({ error: "Not found", message: "No account found with that email address." });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  sqlite.prepare("DELETE FROM otp_verifications WHERE contact = ? AND is_verified = 0").run(normalized);
  sqlite.prepare(
    "INSERT INTO otp_verifications (contact, code, expires_at) VALUES (?, ?, ?)"
  ).run(normalized, code, expiresAt);

  try {
    await sendOtpEmail(normalized, code);
  } catch (err) {
    console.warn("[forgot-password/send-otp] Email delivery failed — falling back to console log.");
    console.log(`\n====================================`);
    console.log(`  Password reset OTP for ${normalized}: ${code}`);
    console.log(`====================================\n`);
  }

  res.json({ message: "Reset code sent" });
});

// POST /auth/forgot-password/reset — verify OTP token and set new password
router.post("/auth/forgot-password/reset", async (req, res) => {
  const { verificationToken, newPassword } = req.body;

  if (!verificationToken || !newPassword) {
    res.status(400).json({ error: "Validation error", message: "verificationToken and newPassword are required." });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Password must be at least 8 characters." });
    return;
  }

  const otpRecord = sqlite.prepare(
    "SELECT * FROM otp_verifications WHERE verification_token = ? AND is_verified = 1"
  ).get(verificationToken) as any;

  if (!otpRecord) {
    res.status(400).json({ error: "Validation error", message: "Invalid or expired reset token. Please start over." });
    return;
  }

  const user = await db.select().from(users).where(eq(users.email, otpRecord.contact)).get();
  if (!user) {
    res.status(400).json({ error: "Not found", message: "Account not found." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

  sqlite.prepare("DELETE FROM otp_verifications WHERE verification_token = ?").run(verificationToken);

  res.json({ message: "Password updated successfully." });
});

// POST /auth/email-change/send-otp — send OTP to the new email (requires auth)
router.post("/auth/email-change/send-otp", requireAuth, async (req, res) => {
  const { newEmail } = req.body;
  const userId = (req as any).user!.id;

  if (!newEmail || !newEmail.trim()) {
    res.status(400).json({ error: "Validation error", message: "newEmail is required." });
    return;
  }

  const normalized = newEmail.trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    res.status(400).json({ error: "Validation error", message: "Please enter a valid email address (e.g. yourname@gmail.com)." });
    return;
  }

  const domainValid = await isEmailDomainValid(normalized);
  if (!domainValid) {
    res.status(400).json({ error: "Validation error", message: "This email address doesn't look real. Please check and try again." });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, normalized)).get();
  if (existing) {
    res.status(400).json({ error: "Validation error", message: "This email is already associated with another account." });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const contact = `email_change:${userId}:${normalized}`;

  sqlite.prepare("DELETE FROM otp_verifications WHERE contact = ? AND is_verified = 0").run(contact);
  sqlite.prepare("INSERT INTO otp_verifications (contact, code, expires_at) VALUES (?, ?, ?)").run(contact, code, expiresAt);

  try {
    await sendOtpEmail(normalized, code);
  } catch {
    console.warn("[email-change/send-otp] Email delivery failed — falling back to console log.");
    console.log(`\n====================================`);
    console.log(`  Email change OTP for ${normalized}: ${code}`);
    console.log(`====================================\n`);
  }

  res.json({ message: "Verification code sent to your new email address." });
});

// POST /auth/email-change/confirm — verify code and update the user's email (requires auth)
router.post("/auth/email-change/confirm", requireAuth, async (req, res) => {
  const { newEmail, code } = req.body;
  const userId = (req as any).user!.id;

  if (!newEmail || !code) {
    res.status(400).json({ error: "Validation error", message: "newEmail and code are required." });
    return;
  }

  const normalized = newEmail.trim().toLowerCase();
  const contact = `email_change:${userId}:${normalized}`;

  const otp = sqlite.prepare(
    "SELECT * FROM otp_verifications WHERE contact = ? AND code = ? AND is_verified = 0 ORDER BY created_at DESC LIMIT 1"
  ).get(contact, code.trim()) as any;

  if (!otp) {
    res.status(400).json({ error: "Invalid code", message: "The code is incorrect or has already been used." });
    return;
  }

  if (new Date(otp.expires_at) < new Date()) {
    res.status(400).json({ error: "Expired code", message: "The verification code has expired. Please request a new one." });
    return;
  }

  const existing = await db.select().from(users).where(eq(users.email, normalized)).get();
  if (existing) {
    res.status(400).json({ error: "Validation error", message: "This email is already associated with another account." });
    return;
  }

  await db.update(users).set({ email: normalized, updatedAt: new Date().toISOString() } as any).where(eq(users.id, userId));
  sqlite.prepare("UPDATE otp_verifications SET is_verified = 1 WHERE id = ?").run(otp.id);

  const updated = await db.select().from(users).where(eq(users.id, userId)).get();

  res.json({
    message: "Email updated successfully.",
    user: updated ? {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      verificationStatus: updated.verificationStatus,
      isSuspended: updated.isSuspended,
      avatarUrl: updated.avatarUrl,
      birthday: updated.birthday ?? null,
      universityOrWorkplace: updated.universityOrWorkplace ?? null,
      emergencyContactName: updated.emergencyContactName ?? null,
      emergencyContactPhone: updated.emergencyContactPhone ?? null,
      bio: updated.bio ?? null,
      phonePublic: updated.phonePublic ?? false,
      createdAt: updated.createdAt,
    } : null,
  });
});

// POST /auth/change-password — change password for the authenticated user
router.post("/auth/change-password", requireAuth, async (req, res) => {
  const userId = (req as any).user!.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Validation error", message: "currentPassword and newPassword are required." });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Validation error", message: "New password must be at least 8 characters." });
    return;
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "Validation error", message: "Current password is incorrect." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

  res.json({ message: "Password changed successfully." });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json(req.user!);
});

export default router;
