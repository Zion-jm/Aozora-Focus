import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser, notifyAllAdmins } from "../lib/notifications";
import { sendSupportResponseEmail } from "../lib/mailer";

const router = Router();

// ─── GET /support-tickets/my — current user's own tickets ────────────────────
router.get("/support-tickets/my", requireAuth, async (req, res) => {
  const userId = req.user!.id;

  const tickets = sqlite.prepare(
    "SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC"
  ).all(userId) as any[];

  const result = tickets.map((t: any) => ({
    id: t.id,
    conversationId: t.conversation_id,
    ticketType: t.ticket_type,
    subject: t.subject,
    message: t.message,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  res.json({ tickets: result });
});

// ─── POST /support-tickets — authenticated user submits a ticket ──────────────
router.post("/support-tickets", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const { ticketType, subject, message, attachmentUrl } = req.body;

  if (userRole === "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admins cannot submit support tickets." });
    return;
  }

  if (!ticketType || !subject || !message) {
    res.status(400).json({ error: "Validation error", message: "ticketType, subject, and message are required" });
    return;
  }

  // One active ticket at a time per user
  const existing = sqlite.prepare(
    "SELECT id FROM support_tickets WHERE user_id = ? AND status = 'pending' LIMIT 1"
  ).get(userId) as any;
  if (existing) {
    res.status(409).json({
      error: "Active ticket exists",
      message: "You already have an open support ticket. Please wait for it to be resolved before submitting a new one.",
    });
    return;
  }

  const admin = sqlite.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  if (!admin) {
    res.status(500).json({ error: "No admin account found" });
    return;
  }
  const adminId = admin.id;

  const now = new Date().toISOString();

  // Each ticket gets its own isolated support thread — never reuse a previous conversation
  const convResult = sqlite.prepare(
    "INSERT INTO admin_conversations (admin_id, user_id, conversation_type, created_at, updated_at) VALUES (?, ?, 'support', ?, ?)"
  ).run(adminId, userId, now, now);
  const convId = convResult.lastInsertRowid;

  // Insert ticket
  const ticketResult = sqlite.prepare(
    `INSERT INTO support_tickets (conversation_id, user_id, ticket_type, subject, message, attachment_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(convId, userId, ticketType, subject, message, attachmentUrl ?? null, now, now);

  // Insert the initial message — no explicit created_at so SQLite uses datetime('now')
  // (ISO-format timestamps sort differently from SQLite's space-separated format in string ORDER BY)
  sqlite.prepare(
    "INSERT INTO admin_messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, 0)"
  ).run(convId, userId, `[${ticketType}] ${subject}\n\n${message}`);

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketResult.lastInsertRowid) as any;
  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;

  notifyAllAdmins(sqlite, {
    type: "support_ticket_new",
    title: "New Support Ticket 🎫",
    body: `${req.user!.fullName} submitted a support ticket: "${subject}"`,
    data: { path: "/admin/support" },
  });

  res.status(201).json({
    ticketId: ticket.id,
    conversationId: conv.id,
    status: ticket.status,
    ticketType: ticket.ticket_type,
    subject: ticket.subject,
  });
});

// ─── POST /support-tickets/public — unauthenticated (suspended users) ─────────
router.post("/support-tickets/public", async (req, res) => {
  const { guestName, guestEmail, ticketType, subject, message } = req.body;

  if (!guestName || !guestEmail || !ticketType || !subject || !message) {
    res.status(400).json({ error: "Validation error", message: "guestName, guestEmail, ticketType, subject, and message are required" });
    return;
  }

  // Email must belong to a registered account
  const existingUser = sqlite.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(guestEmail) as any;
  if (!existingUser) {
    res.status(403).json({
      error: "Email not registered",
      message: "The email address you entered is not registered in Aozora. Please use the email address linked to your account.",
    });
    return;
  }

  const now = new Date().toISOString();
  const ticketResult = sqlite.prepare(
    `INSERT INTO support_tickets (guest_name, guest_email, ticket_type, subject, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(guestName, guestEmail, ticketType, subject, message, now, now);

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketResult.lastInsertRowid) as any;

  notifyAllAdmins(sqlite, {
    type: "support_ticket_new",
    title: "New Support Ticket (Guest) 🎫",
    body: `${guestName} submitted a support ticket: "${subject}"`,
    data: { path: "/admin/support" },
  });

  res.status(201).json({
    ticketId: ticket.id,
    status: ticket.status,
    message: "Your support request has been submitted. We'll reach out to you via email.",
  });
});

// ─── GET /admin/support-tickets — list all tickets ────────────────────────────
router.get("/admin/support-tickets", requireAuth, requireRole("admin"), async (_req, res) => {
  const tickets = sqlite.prepare(
    "SELECT * FROM support_tickets ORDER BY created_at DESC"
  ).all() as any[];

  const enriched = tickets.map((t: any) => {
    const user = t.user_id
      ? (sqlite.prepare("SELECT id, full_name, email, avatar_url, role FROM users WHERE id = ?").get(t.user_id) as any)
      : null;

    return {
      id: t.id,
      conversationId: t.conversation_id,
      ticketType: t.ticket_type,
      subject: t.subject,
      message: t.message,
      attachmentUrl: t.attachment_url,
      status: t.status,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      guestName: t.guest_name,
      guestEmail: t.guest_email,
      adminResponse: t.admin_response ?? null,
      emailSentAt: t.email_sent_at ?? null,
      user: user ? {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        role: user.role,
        isSuspended: !!user.is_suspended,
      } : null,
    };
  });

  const pendingCount = enriched.filter((t) => t.status === "pending").length;
  res.json({ tickets: enriched, pendingCount });
});

// ─── POST /admin/support-tickets/:id/respond — send email response to guest/suspended user ──
router.post("/admin/support-tickets/:id/respond", requireAuth, requireRole("admin"), async (req, res) => {
  const ticketId = parseInt(req.params["id"]!);
  const { responseType } = req.body;

  const VALID_TYPES = [
    "suspension_lifted", "suspension_persists",
    "decision_overturned", "rejection_stands",
    "takedown_reversed", "takedown_upheld",
    "request_resolved", "request_denied",
    "bug_fixed", "bug_in_progress",
  ];

  if (!responseType || !VALID_TYPES.includes(responseType)) {
    res.status(400).json({ error: "Validation error", message: "Invalid responseType" });
    return;
  }

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId) as any;
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  // Determine recipient email
  let recipientEmail: string | null = ticket.guest_email ?? null;
  let recipientName: string = ticket.guest_name ?? "there";

  if (!recipientEmail && ticket.user_id) {
    const user = sqlite.prepare("SELECT email, full_name FROM users WHERE id = ?").get(ticket.user_id) as any;
    recipientEmail = user?.email ?? null;
    recipientName = user?.full_name ?? "there";
  }

  if (!recipientEmail) {
    res.status(400).json({ error: "No email address available for this ticket" });
    return;
  }

  try {
    await sendSupportResponseEmail({
      to: recipientEmail,
      name: recipientName,
      ticketType: ticket.ticket_type,
      subject: ticket.subject,
      responseType,
    });
  } catch (err: any) {
    console.error("Failed to send support response email:", err?.message);
    res.status(500).json({ error: "Failed to send email", message: err?.message });
    return;
  }

  const now = new Date().toISOString();
  sqlite.prepare(
    "UPDATE support_tickets SET admin_response = ?, email_sent_at = ?, status = 'resolved', updated_at = ? WHERE id = ?"
  ).run(responseType, now, now, ticketId);

  // Sync conversation closed_at if present
  if (ticket.conversation_id) {
    sqlite.prepare("UPDATE admin_conversations SET closed_at = ? WHERE id = ?").run(now, ticket.conversation_id);
  }

  // Notify in-app user if they have an account
  if (ticket.user_id) {
    notifyUser(sqlite, ticket.user_id, {
      type: "support_ticket_resolved",
      title: "Support Ticket Resolved ✅",
      body: `Your support ticket "${ticket.subject}" has been resolved.`,
      data: ticket.conversation_id
        ? { path: `/admin-conversation/${ticket.conversation_id}` }
        : { path: "/(tabs)/profile" },
    });
  }

  const updated = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId) as any;
  res.json({ id: updated.id, status: updated.status, adminResponse: updated.admin_response, emailSentAt: updated.email_sent_at });
});

// ─── PATCH /admin/support-tickets/:id — update status ─────────────────────────
router.patch("/admin/support-tickets/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const ticketId = parseInt(req.params["id"]!);
  const { status } = req.body;

  if (!status || !["pending", "resolved"].includes(status)) {
    res.status(400).json({ error: "Validation error", message: "status must be 'pending' or 'resolved'" });
    return;
  }

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId) as any;
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const now = new Date().toISOString();
  sqlite.prepare("UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?").run(status, now, ticketId);

  // Sync conversation closed_at with ticket status
  if (ticket.conversation_id) {
    if (status === "resolved") {
      sqlite.prepare("UPDATE admin_conversations SET closed_at = ? WHERE id = ?").run(now, ticket.conversation_id);
    } else {
      sqlite.prepare("UPDATE admin_conversations SET closed_at = NULL WHERE id = ?").run(ticket.conversation_id);
    }
  }

  // Notify the user when their ticket is resolved
  if (status === "resolved" && ticket.user_id) {
    notifyUser(sqlite, ticket.user_id, {
      type: "support_ticket_resolved",
      title: "Support Ticket Resolved ✅",
      body: `Your support ticket "${ticket.subject}" has been resolved.`,
      data: ticket.conversation_id
        ? { path: `/admin-conversation/${ticket.conversation_id}` }
        : { path: "/(tabs)/profile" },
    });
  }

  const updated = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId) as any;
  res.json({ id: updated.id, status: updated.status, updatedAt: updated.updated_at });
});

export default router;
