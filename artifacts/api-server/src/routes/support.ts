import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createNotification } from "../lib/notifications";
import { notifyUser, notifyAllAdmins } from "../lib/notifications";

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

  // Insert the initial message into the conversation
  sqlite.prepare(
    "INSERT INTO admin_messages (conversation_id, sender_id, content, is_read, created_at) VALUES (?, ?, ?, 0, ?)"
  ).run(convId, userId, `[${ticketType}] ${subject}\n\n${message}`, now);

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
      user: user ? {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        avatarUrl: user.avatar_url,
        role: user.role,
      } : null,
    };
  });

  const pendingCount = enriched.filter((t) => t.status === "pending").length;
  res.json({ tickets: enriched, pendingCount });
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
