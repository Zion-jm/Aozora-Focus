import { Router } from "express";
import { db, sqlite } from "../db/index";
import { conversations, messages, dorms, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { createNotification, notifyUser } from "../lib/notifications";

const router = Router();

// ─── Regular (dorm) conversations ────────────────────────────────────────────

async function serializeConversation(conv: typeof conversations.$inferSelect, currentUserId: number) {
  const dorm = await db.select().from(dorms).where(eq(dorms.id, conv.dormId)).get();
  const otherId = conv.studentId === currentUserId ? conv.ownerId : conv.studentId;
  const other = await db.select().from(users).where(eq(users.id, otherId)).get();
  const allMsgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).all();
  const lastMsg = allMsgs.length ? allMsgs[allMsgs.length - 1] : null;
  const unread = allMsgs.filter((m) => !m.isRead && m.senderId !== currentUserId).length;

  const convRaw = sqlite.prepare("SELECT student_archived_at, owner_archived_at FROM conversations WHERE id = ?").get(conv.id) as any;
  const isStudent = conv.studentId === currentUserId;
  const myArchivedAt = isStudent ? convRaw?.student_archived_at : convRaw?.owner_archived_at;

  return {
    type: "dorm",
    id: conv.id,
    dormId: conv.dormId,
    studentId: conv.studentId,
    ownerId: conv.ownerId,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    archived: !!myArchivedAt,
    dorm: dorm ? {
      id: dorm.id,
      ownerId: dorm.ownerId,
      name: dorm.name,
      description: dorm.description,
      monthlyRent: dorm.monthlyRent,
      address: dorm.address,
      latitude: dorm.latitude,
      longitude: dorm.longitude,
      amenities: JSON.parse(dorm.amenities || "[]"),
      totalRooms: dorm.totalRooms,
      bedsPerRoom: dorm.bedsPerRoom,
      availableBeds: dorm.availableBeds,
      status: dorm.status,
      coverPhotoUrl: dorm.coverPhotoUrl,
      averageRating: dorm.averageRating,
      totalReviews: dorm.totalReviews,
      createdAt: dorm.createdAt,
    } : null,
    otherParticipant: other ? {
      id: other.id,
      fullName: other.fullName,
      role: other.role,
      verificationStatus: other.verificationStatus,
      avatarUrl: other.avatarUrl,
    } : null,
    lastMessage: lastMsg,
    unreadCount: unread,
  };
}

// ─── Admin conversations helpers ─────────────────────────────────────────────

function serializeAdminConversation(conv: any, currentUserId: number) {
  const isAdmin = conv.admin_id === currentUserId;
  const otherId = isAdmin ? conv.user_id : conv.admin_id;
  const other = sqlite.prepare("SELECT id, full_name, role, verification_status, avatar_url FROM users WHERE id = ?").get(otherId) as any;
  const allMsgs = sqlite.prepare("SELECT * FROM admin_messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conv.id) as any[];
  const lastMsg = allMsgs.length ? allMsgs[allMsgs.length - 1] : null;
  const unread = allMsgs.filter((m: any) => !m.is_read && m.sender_id !== currentUserId).length;

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE conversation_id = ?").get(conv.id) as any;

  const myArchivedAt = isAdmin ? conv.admin_archived_at : conv.user_archived_at;
  const archived = !!conv.closed_at || !!myArchivedAt;

  return {
    type: "admin",
    id: conv.id,
    adminId: conv.admin_id,
    userId: conv.user_id,
    conversationType: conv.conversation_type || "warning",
    dormId: null,
    dorm: null,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
    closedAt: conv.closed_at || null,
    archived,
    otherParticipant: other ? {
      id: other.id,
      fullName: other.full_name,
      role: other.role,
      verificationStatus: other.verification_status,
      avatarUrl: other.avatar_url,
    } : null,
    lastMessage: lastMsg ? {
      id: lastMsg.id,
      conversationId: lastMsg.conversation_id,
      senderId: lastMsg.sender_id,
      content: lastMsg.content,
      isRead: !!lastMsg.is_read,
      createdAt: lastMsg.created_at,
    } : null,
    unreadCount: unread,
    ticket: ticket ? {
      id: ticket.id,
      ticketType: ticket.ticket_type,
      subject: ticket.subject,
      status: ticket.status,
    } : null,
  };
}

// ─── GET /conversations — regular + admin merged ──────────────────────────────

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  const enriched: any[] = [];

  if (role === "admin") {
    const adminConvs = sqlite.prepare(
      "SELECT * FROM admin_conversations WHERE admin_id = ? AND admin_deleted_at IS NULL ORDER BY updated_at DESC"
    ).all(userId) as any[];
    for (const c of adminConvs) {
      enriched.push(serializeAdminConversation(c, userId));
    }
  } else {
    const allConvs = await db.select().from(conversations).all();
    const myConvs = allConvs.filter((c) => {
      if (c.studentId === userId) return !(c as any).studentDeletedAt;
      if (c.ownerId === userId) return !(c as any).ownerDeletedAt;
      return false;
    });
    const dormSerialized = await Promise.all(myConvs.map((c) => serializeConversation(c, userId)));
    enriched.push(...dormSerialized);

    const adminConvs = sqlite.prepare(
      "SELECT * FROM admin_conversations WHERE user_id = ? AND user_deleted_at IS NULL ORDER BY updated_at DESC"
    ).all(userId) as any[];
    for (const c of adminConvs) {
      enriched.push(serializeAdminConversation(c, userId));
    }
  }

  enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const totalUnread = enriched.reduce((sum, c) => sum + c.unreadCount, 0);

  res.json({ conversations: enriched, totalUnread });
});

// ─── POST /conversations — start dorm conversation ────────────────────────────
// Supports two flows:
//   1. Student → Owner: { dormId, initialMessage }
//   2. Owner → Student: { dormId, targetStudentId, initialMessage } (owner picks their own dorm)

router.post("/conversations", requireAuth, async (req, res) => {
  const { dormId, initialMessage, targetStudentId } = req.body;
  const userId = req.user!.id;

  if (!dormId) {
    res.status(400).json({ error: "Validation error", message: "dormId is required" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();
  if (!dorm) {
    res.status(404).json({ error: "Not found", message: "Dorm not found" });
    return;
  }

  // Flow 2: Owner initiates conversation with a specific student about their own dorm
  if (targetStudentId) {
    if (dorm.ownerId !== userId) {
      res.status(403).json({ error: "Forbidden", message: "You can only message students about your own dorms" });
      return;
    }

    let conv = await db.select().from(conversations).where(
      and(eq(conversations.dormId, dormId), eq(conversations.studentId, targetStudentId))
    ).get();

    if (!conv) {
      const result = await db.insert(conversations).values({
        dormId,
        studentId: targetStudentId,
        ownerId: userId,
      }).returning();
      conv = result[0]!;
    }

    if (initialMessage) {
      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: userId,
        content: initialMessage,
        isRead: false,
      });
      await db.update(conversations).set({ updatedAt: new Date().toISOString() }).where(eq(conversations.id, conv.id));
      notifyUser(sqlite, targetStudentId, {
        type: "message_new",
        title: "New Message 💬",
        body: `You received a message from ${req.user!.fullName}.`,
        relatedId: conv.id,
        relatedType: "conversation",
      });
    }

    return res.status(201).json(await serializeConversation(conv, userId));
  }

  // Flow 1: Student initiates conversation about an owner's dorm
  if (!initialMessage) {
    res.status(400).json({ error: "Validation error", message: "initialMessage is required" });
    return;
  }

  let conv = await db.select().from(conversations).where(
    and(eq(conversations.dormId, dormId), eq(conversations.studentId, userId))
  ).get();

  if (!conv) {
    const result = await db.insert(conversations).values({
      dormId,
      studentId: userId,
      ownerId: dorm.ownerId,
    }).returning();
    conv = result[0]!;
  }

  await db.insert(messages).values({
    conversationId: conv.id,
    senderId: userId,
    content: initialMessage,
    isRead: false,
  });

  await db.update(conversations).set({ updatedAt: new Date().toISOString() }).where(eq(conversations.id, conv.id));

  notifyUser(sqlite, dorm.ownerId, {
    type: "message_new",
    title: "New Message 💬",
    body: `You received a message from ${req.user!.fullName}.`,
    relatedId: conv.id,
    relatedType: "conversation",
  });

  res.status(201).json(await serializeConversation(conv, userId));
});

// ─── GET /conversations/:id/messages ─────────────────────────────────────────

router.get("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const userId = req.user!.id;
  const page = parseInt((req.query["page"] as string) ?? "1");
  const limit = 50;

  const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv || (conv.studentId !== userId && conv.ownerId !== userId && req.user!.role !== "admin")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const allMsgs = await db.select().from(messages).where(eq(messages.conversationId, convId)).all();
  allMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const total = allMsgs.length;
  const paginated = allMsgs.slice((page - 1) * limit, page * limit);

  const enriched = await Promise.all(
    paginated.map(async (msg) => {
      const sender = await db.select().from(users).where(eq(users.id, msg.senderId)).get();
      return {
        ...msg,
        sender: sender
          ? { id: sender.id, fullName: sender.fullName, avatarUrl: sender.avatarUrl }
          : null,
      };
    })
  );

  res.json({ messages: enriched, total, page });
});

// ─── POST /conversations/:id/messages ────────────────────────────────────────

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const { content, imageUrl } = req.body;
  const userId = req.user!.id;

  if (!content && !imageUrl) {
    res.status(400).json({ error: "Validation error", message: "content or imageUrl is required" });
    return;
  }

  const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv || (conv.studentId !== userId && conv.ownerId !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await db.insert(messages).values({
    conversationId: convId,
    senderId: userId,
    content: content || "",
    imageUrl: imageUrl || null,
    isRead: false,
  }).returning();

  const now = new Date().toISOString();
  await db.update(conversations).set({ updatedAt: now }).where(eq(conversations.id, convId));
  // Auto-unarchive for both participants when a message is sent
  sqlite.prepare("UPDATE conversations SET student_archived_at = NULL, owner_archived_at = NULL WHERE id = ?").run(convId);

  // Notify the other participant
  const recipientId = conv.studentId === userId ? conv.ownerId : conv.studentId;
  const sender = await db.select().from(users).where(eq(users.id, userId)).get();
  const dorm = await db.select().from(dorms).where(eq(dorms.id, conv.dormId)).get();
  const otherPartyId = conv.studentId === userId ? conv.ownerId : conv.studentId;
  notifyUser(sqlite, otherPartyId, {
    type: "message_new",
    title: "New Message 💬",
    body: `You received a message from ${req.user!.fullName}.`,
    relatedId: convId,
    relatedType: "conversation",
  });

  res.status(201).json(result[0]);
});

// ─── DELETE /conversations/:id — soft-delete for current user ────────────────

router.delete("/conversations/:conversationId", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const userId = req.user!.id;
  const role = req.user!.role;

  const conv = sqlite.prepare("SELECT * FROM conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.student_id !== userId && conv.owner_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date().toISOString();
  if (role === "student" || conv.student_id === userId) {
    sqlite.prepare("UPDATE conversations SET student_deleted_at = ? WHERE id = ?").run(now, convId);
  } else {
    sqlite.prepare("UPDATE conversations SET owner_deleted_at = ? WHERE id = ?").run(now, convId);
  }

  res.json({ message: "Conversation deleted" });
});

// ─── POST /conversations/:id/archive — per-user archive ──────────────────────

router.post("/conversations/:conversationId/archive", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.student_id !== userId && conv.owner_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date().toISOString();
  if (conv.student_id === userId) {
    sqlite.prepare("UPDATE conversations SET student_archived_at = ? WHERE id = ?").run(now, convId);
  } else {
    sqlite.prepare("UPDATE conversations SET owner_archived_at = ? WHERE id = ?").run(now, convId);
  }

  res.json({ message: "Conversation archived" });
});

// ─── POST /conversations/:id/unarchive ───────────────────────────────────────

router.post("/conversations/:conversationId/unarchive", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.student_id !== userId && conv.owner_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (conv.student_id === userId) {
    sqlite.prepare("UPDATE conversations SET student_archived_at = NULL WHERE id = ?").run(convId);
  } else {
    sqlite.prepare("UPDATE conversations SET owner_archived_at = NULL WHERE id = ?").run(convId);
  }

  res.json({ message: "Conversation unarchived" });
});

// ─── POST /conversations/:id/read ────────────────────────────────────────────

router.post("/conversations/:conversationId/read", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const userId = req.user!.id;

  const conv = await db.select().from(conversations).where(eq(conversations.id, convId)).get();
  if (!conv || (conv.studentId !== userId && conv.ownerId !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const allMsgs = await db.select().from(messages).where(eq(messages.conversationId, convId)).all();
  const unread = allMsgs.filter((m) => !m.isRead && m.senderId !== userId);
  for (const msg of unread) {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, msg.id));
  }

  res.json({ message: "Marked as read" });
});

// ─── ADMIN CONVERSATIONS ──────────────────────────────────────────────────────

// POST /user/admin-conversation — disabled; users must use the Help Center to contact admin
router.post("/user/admin-conversation", requireAuth, async (req, res) => {
  res.status(400).json({
    error: "Direct admin conversations are disabled. Please use the Help Center to submit a support ticket.",
  });
});

// POST /admin/conversations — admin opens (or re-opens) the ONE warning thread for a user
router.post("/admin/conversations", requireAuth, requireRole("admin"), async (req, res) => {
  const { userId } = req.body;
  const adminId = req.user!.id;

  if (!userId) {
    res.status(400).json({ error: "Validation error", message: "userId is required" });
    return;
  }

  const targetUser = sqlite.prepare("SELECT id FROM users WHERE id = ?").get(userId) as any;
  if (!targetUser) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  let conv = sqlite.prepare(
    "SELECT * FROM admin_conversations WHERE admin_id = ? AND user_id = ? AND conversation_type = 'warning'"
  ).get(adminId, userId) as any;

  if (!conv) {
    const result = sqlite.prepare(
      "INSERT INTO admin_conversations (admin_id, user_id, conversation_type) VALUES (?, ?, 'warning')"
    ).run(adminId, userId);
    conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(result.lastInsertRowid) as any;
  }

  res.status(201).json(serializeAdminConversation(conv, adminId));
});

// GET /admin/conversations — list all admin conversations (admin sees all they started)
router.get("/admin/conversations", requireAuth, requireRole("admin"), async (req, res) => {
  const adminId = req.user!.id;
  const convs = sqlite.prepare(
    "SELECT * FROM admin_conversations WHERE admin_id = ? ORDER BY updated_at DESC"
  ).all(adminId) as any[];

  const enriched = convs.map((c) => serializeAdminConversation(c, adminId));
  res.json({ conversations: enriched });
});

// GET /admin-conversations/:id/messages
router.get("/admin-conversations/:id/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Sort in JS so both ISO (T) and SQLite-space formats compare correctly
  const toMs = (ts: string) => new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z").getTime();
  const msgs = (sqlite.prepare(
    "SELECT * FROM admin_messages WHERE conversation_id = ?"
  ).all(convId) as any[]).sort((a: any, b: any) => toMs(a.created_at) - toMs(b.created_at));

  const result = msgs.map((m: any) => {
    const sender = sqlite.prepare("SELECT id, full_name, avatar_url FROM users WHERE id = ?").get(m.sender_id) as any;
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      content: m.content,
      imageUrl: m.image_url ?? null,
      isRead: !!m.is_read,
      createdAt: m.created_at,
      sender: sender
        ? { id: sender.id, fullName: sender.full_name, avatarUrl: sender.avatar_url }
        : null,
    };
  });

  const ticket = sqlite.prepare("SELECT * FROM support_tickets WHERE conversation_id = ?").get(convId) as any;

  res.json({
    messages: result,
    total: result.length,
    page: 1,
    closedAt: conv.closed_at || null,
    startedAt: conv.started_at || null,
    conversationType: conv.conversation_type || "warning",
    ticket: ticket ? {
      id: ticket.id,
      ticketType: ticket.ticket_type,
      subject: ticket.subject,
      status: ticket.status,
    } : null,
  });
});

// DELETE /admin-conversations/:id — soft-delete for current user
router.delete("/admin-conversations/:id", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date().toISOString();
  if (conv.admin_id === userId) {
    sqlite.prepare("UPDATE admin_conversations SET admin_deleted_at = ? WHERE id = ?").run(now, convId);
  } else {
    sqlite.prepare("UPDATE admin_conversations SET user_deleted_at = ? WHERE id = ?").run(now, convId);
  }

  res.json({ message: "Conversation deleted" });
});

// POST /admin-conversations/:id/archive — per-user archive
router.post("/admin-conversations/:id/archive", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const now = new Date().toISOString();
  if (conv.admin_id === userId) {
    sqlite.prepare("UPDATE admin_conversations SET admin_archived_at = ? WHERE id = ?").run(now, convId);
  } else {
    sqlite.prepare("UPDATE admin_conversations SET user_archived_at = ? WHERE id = ?").run(now, convId);
  }

  res.json({ message: "Conversation archived" });
});

// POST /admin-conversations/:id/unarchive
router.post("/admin-conversations/:id/unarchive", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (conv.admin_id === userId) {
    sqlite.prepare("UPDATE admin_conversations SET admin_archived_at = NULL WHERE id = ?").run(convId);
  } else {
    sqlite.prepare("UPDATE admin_conversations SET user_archived_at = NULL WHERE id = ?").run(convId);
  }

  res.json({ message: "Conversation unarchived" });
});

// POST /admin-conversations/:id/messages
router.post("/admin-conversations/:id/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const { content, imageUrl } = req.body;
  const userId = req.user!.id;

  if (!content && !imageUrl) {
    res.status(400).json({ error: "Validation error", message: "content or imageUrl is required" });
    return;
  }

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Block messaging on closed (resolved) support conversations
  if (conv.closed_at) {
    res.status(423).json({ error: "Conversation closed", message: "This support ticket has been resolved. The conversation is closed." });
    return;
  }

  const senderRole = req.user!.role;

  // Block users from messaging support tickets until admin starts the conversation
  if (conv.conversation_type === "support" && senderRole !== "admin" && !conv.started_at) {
    res.status(423).json({ error: "Conversation not started", message: "An admin has not yet started this conversation. Please wait." });
    return;
  }

  // Enforce one-way: non-admins cannot reply to warning conversations
  if ((conv.conversation_type || "warning") === "warning" && senderRole !== "admin") {
    res.status(403).json({ error: "This is a one-way official notice. You cannot reply to this message." });
    return;
  }

  const result = sqlite.prepare(
    "INSERT INTO admin_messages (conversation_id, sender_id, content, image_url, is_read) VALUES (?, ?, ?, ?, 0)"
  ).run(convId, userId, content || "", imageUrl || null);

  const nowTs = new Date().toISOString();
  sqlite.prepare("UPDATE admin_conversations SET updated_at = ?, admin_archived_at = NULL, user_archived_at = NULL WHERE id = ?").run(nowTs, convId);

  const msg = sqlite.prepare("SELECT * FROM admin_messages WHERE id = ?").get(result.lastInsertRowid) as any;

  // Notify the other participant
  const recipientId = conv.admin_id === userId ? conv.user_id : conv.admin_id;
  const senderUser = sqlite.prepare("SELECT full_name FROM users WHERE id = ?").get(userId) as any;
  const convType = conv.conversation_type || "warning";
  if (convType === "support") {
    createNotification({
      userId: recipientId,
      type: "admin_message",
      title: conv.admin_id === userId ? "Admin replied to your support ticket" : `New support message from ${senderUser?.full_name ?? "You"}`,
      body: conv.admin_id === userId
        ? `You received a reply from Admin.`
        : `You received a message from ${senderUser?.full_name ?? "a user"}.`,
      relatedId: convId,
      relatedType: "conversation",
    });
  } else if (convType === "warning") {
    // Warning is one-way (admin → user only); user cannot reply, so only notify user
    if (conv.admin_id === userId) {
      createNotification({
        userId: recipientId,
        type: "admin_message",
        title: "New message from Admin",
        body: `You received a message from Admin.`,
        relatedId: convId,
        relatedType: "conversation",
      });
    }
  }
  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    content: msg.content,
    imageUrl: msg.image_url ?? null,
    isRead: !!msg.is_read,
    createdAt: msg.created_at,
  });
});

// POST /admin-conversations/:id/start — admin starts a support conversation
router.post("/admin-conversations/:id/start", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || conv.admin_id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (conv.conversation_type !== "support") {
    res.status(400).json({ error: "Only support conversations can be started this way." });
    return;
  }

  const now = new Date().toISOString();
  sqlite.prepare("UPDATE admin_conversations SET started_at = ?, updated_at = ? WHERE id = ?").run(now, now, convId);

  res.json({ startedAt: now });
});

// POST /admin-conversations/:id/read
router.post("/admin-conversations/:id/read", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const userId = req.user!.id;

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  sqlite.prepare(
    "UPDATE admin_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0"
  ).run(convId, userId);

  res.json({ message: "Marked as read" });
});

export default router;
