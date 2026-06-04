import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notifyUser, notifyAllAdmins } from "../lib/notifications";
import { sendSupportResponseEmail, sendAppealApprovedEmail, sendAppealDeniedEmail, sendBugFixedEmail } from "../lib/mailer";

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
    relatedId: ticket.id as number,
    relatedType: "support_ticket",
  });

  res.status(201).json({
    ticketId: ticket.id,
    conversationId: conv.id,
    status: ticket.status,
    ticketType: ticket.ticket_type,
    subject: ticket.subject,
  });
});

// ─── POST /support-tickets/public — unauthenticated guests & suspended users ──
router.post("/support-tickets/public", async (req, res) => {
  const { guestName, guestEmail, ticketType, subject, message } = req.body;

  if (!guestName || !guestEmail || !ticketType || !subject || !message) {
    res.status(400).json({ error: "Validation error", message: "guestName, guestEmail, ticketType, subject, and message are required" });
    return;
  }

  const isAppealSuspension = ticketType === "Appeal Suspension";

  if (isAppealSuspension) {
    // For suspension appeals: email must belong to a registered, currently-suspended account
    const suspendedUser = sqlite.prepare(
      "SELECT id, is_suspended, suspended_until, appeal_cooldown_until FROM users WHERE email = ? LIMIT 1"
    ).get(guestEmail) as any;

    if (!suspendedUser) {
      res.status(403).json({
        error: "Email not registered",
        message: "The email address you entered is not registered in Aozora. Please use the email address linked to your suspended account.",
      });
      return;
    }

    if (!suspendedUser.is_suspended) {
      res.status(400).json({
        error: "Not suspended",
        message: "Your account does not appear to be suspended. If you are having trouble logging in, please select a different ticket type.",
      });
      return;
    }

    // Check 24-hour cooldown from a previously denied appeal
    if (suspendedUser.appeal_cooldown_until) {
      const cooldownEnd = new Date(suspendedUser.appeal_cooldown_until);
      if (cooldownEnd > new Date()) {
        const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / 3_600_000);
        res.status(429).json({
          error: "Cooldown",
          message: `Your last appeal was denied. You may resubmit in ${hoursLeft} hour${hoursLeft !== 1 ? "s" : ""}.`,
        });
        return;
      }
    }
  }

  const now = new Date().toISOString();
  const ticketResult = sqlite.prepare(
    `INSERT INTO support_tickets (guest_name, guest_email, ticket_type, subject, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).run(guestName, guestEmail, ticketType, subject, message, now, now);

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketResult.lastInsertRowid) as any;

  notifyAllAdmins(sqlite, {
    type: "support_ticket_new",
    title: isAppealSuspension ? "New Suspension Appeal (Guest) 🔓" : "New Support Ticket (Guest) 🎫",
    body: `${guestName} submitted a support ticket: "${subject}"`,
    relatedId: ticket.id as number,
    relatedType: "support_ticket",
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

  // Determine recipient email and name
  let recipientEmail: string | null = ticket.guest_email ?? null;
  let recipientName: string = ticket.guest_name ?? "there";

  // For guest tickets look up the registered user by email (needed for suspension actions)
  let linkedUserId: number | null = ticket.user_id ?? null;
  let linkedUserSuspendedUntil: string | null = null;

  if (ticket.user_id) {
    const userRow = sqlite.prepare("SELECT email, full_name, suspended_until FROM users WHERE id = ?").get(ticket.user_id) as any;
    recipientEmail = userRow?.email ?? recipientEmail;
    recipientName = userRow?.full_name ?? recipientName;
    linkedUserSuspendedUntil = userRow?.suspended_until ?? null;
  } else if (ticket.guest_email) {
    const guestUserRow = sqlite.prepare("SELECT id, full_name, suspended_until FROM users WHERE email = ? LIMIT 1").get(ticket.guest_email) as any;
    if (guestUserRow) {
      linkedUserId = guestUserRow.id;
      linkedUserSuspendedUntil = guestUserRow.suspended_until ?? null;
      if (guestUserRow.full_name) recipientName = guestUserRow.full_name;
    }
  }

  if (!recipientEmail) {
    res.status(400).json({ error: "No email address available for this ticket" });
    return;
  }

  const now = new Date().toISOString();

  try {
    if (responseType === "suspension_lifted") {
      // Unsuspend the user and clear any appeal cooldown
      if (linkedUserId) {
        sqlite.prepare(
          "UPDATE users SET is_suspended = 0, suspended_until = NULL, appeal_cooldown_until = NULL, updated_at = ? WHERE id = ?"
        ).run(now, linkedUserId);

        notifyUser(sqlite, linkedUserId, {
          type: "suspension_lifted",
          title: "Suspension Lifted ✅",
          body: "Your appeal has been approved. Your account suspension has been lifted and full access has been restored.",
          relatedId: ticketId,
          relatedType: "support_ticket",
        });
      }
      await sendAppealApprovedEmail({ to: recipientEmail, name: recipientName });

    } else if (responseType === "suspension_persists") {
      // Set a 24-hour cooldown so the user cannot immediately resubmit
      if (linkedUserId) {
        const cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        sqlite.prepare(
          "UPDATE users SET appeal_cooldown_until = ?, updated_at = ? WHERE id = ?"
        ).run(cooldownUntil, now, linkedUserId);
      }

      const restorationDate = linkedUserSuspendedUntil
        ? new Date(linkedUserSuspendedUntil).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        : "the originally specified date";

      await sendAppealDeniedEmail({ to: recipientEmail, name: recipientName, restorationDate });

    } else if (responseType === "bug_fixed") {
      await sendBugFixedEmail({
        to: recipientEmail,
        name: recipientName,
        bugName: ticket.subject,
        bugDescription: (ticket.message as string).slice(0, 300),
      });
    } else {
      await sendSupportResponseEmail({
        to: recipientEmail,
        name: recipientName,
        ticketType: ticket.ticket_type,
        subject: ticket.subject,
        responseType,
      });
    }
  } catch (err: any) {
    console.error("Failed to send support response email:", err?.message);
    res.status(500).json({ error: "Failed to send email", message: err?.message });
    return;
  }

  // bug_in_progress keeps ticket open so admin can later send bug_fixed
  const newStatus = responseType === "bug_in_progress" ? "pending" : "resolved";

  sqlite.prepare(
    "UPDATE support_tickets SET admin_response = ?, email_sent_at = ?, status = ?, updated_at = ? WHERE id = ?"
  ).run(responseType, now, newStatus, now, ticketId);

  // Sync conversation closed_at only when resolving
  if (newStatus === "resolved" && ticket.conversation_id) {
    sqlite.prepare("UPDATE admin_conversations SET closed_at = ? WHERE id = ?").run(now, ticket.conversation_id);
  }

  // Notify in-app user if they have an account (for non-suspension-lifted, which already notified above)
  if (ticket.user_id && responseType !== "suspension_lifted" && newStatus === "resolved") {
    notifyUser(sqlite, ticket.user_id, {
      type: "support_ticket_resolved",
      title: "Support Ticket Resolved ✅",
      body: `Your support ticket "${ticket.subject}" has been resolved.`,
      relatedId: ticket.conversation_id ?? ticketId,
      relatedType: ticket.conversation_id ? "conversation" : "support_ticket",
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
      relatedId: ticket.conversation_id ?? ticketId,
      relatedType: ticket.conversation_id ? "conversation" : "support_ticket",
    });
  }

  const updated = sqlite.prepare("SELECT * FROM support_tickets WHERE id = ?").get(ticketId) as any;
  res.json({ id: updated.id, status: updated.status, updatedAt: updated.updated_at });
});

export default router;
