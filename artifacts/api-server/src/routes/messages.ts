import { Router } from "express";
import { db, sqlite } from "../db/index";
import { conversations, messages, dorms, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// ─── Regular (dorm) conversations ────────────────────────────────────────────

async function serializeConversation(conv: typeof conversations.$inferSelect, currentUserId: number) {
  const dorm = await db.select().from(dorms).where(eq(dorms.id, conv.dormId)).get();
  const otherId = conv.studentId === currentUserId ? conv.ownerId : conv.studentId;
  const other = await db.select().from(users).where(eq(users.id, otherId)).get();
  const allMsgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).all();
  const lastMsg = allMsgs.length ? allMsgs[allMsgs.length - 1] : null;
  const unread = allMsgs.filter((m) => !m.isRead && m.senderId !== currentUserId).length;

  return {
    type: "dorm",
    id: conv.id,
    dormId: conv.dormId,
    studentId: conv.studentId,
    ownerId: conv.ownerId,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
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

  return {
    type: "admin",
    id: conv.id,
    adminId: conv.admin_id,
    userId: conv.user_id,
    dormId: null,
    dorm: null,
    createdAt: conv.created_at,
    updatedAt: conv.updated_at,
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
  };
}

// ─── GET /conversations — regular + admin merged ──────────────────────────────

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;

  const enriched: any[] = [];

  if (role === "admin") {
    // Admins see only their non-deleted admin conversations
    const adminConvs = sqlite.prepare(
      "SELECT * FROM admin_conversations WHERE admin_id = ? AND admin_deleted_at IS NULL ORDER BY updated_at DESC"
    ).all(userId) as any[];
    for (const c of adminConvs) {
      enriched.push(serializeAdminConversation(c, userId));
    }
  } else {
    // Regular users: dorm conversations (non-deleted) + admin conversations directed at them (non-deleted)
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

router.post("/conversations", requireAuth, async (req, res) => {
  const { dormId, initialMessage } = req.body;
  const userId = req.user!.id;

  if (!dormId || !initialMessage) {
    res.status(400).json({ error: "Validation error", message: "dormId and initialMessage are required" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();
  if (!dorm) {
    res.status(404).json({ error: "Not found", message: "Dorm not found" });
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

  res.json({ messages: paginated, total, page });
});

// ─── POST /conversations/:id/messages ────────────────────────────────────────

router.post("/conversations/:conversationId/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["conversationId"]!);
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content) {
    res.status(400).json({ error: "Validation error", message: "content is required" });
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
    content,
    isRead: false,
  }).returning();

  await db.update(conversations).set({ updatedAt: new Date().toISOString() }).where(eq(conversations.id, convId));

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

// POST /admin/conversations — admin starts or retrieves existing conversation with a user
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
    "SELECT * FROM admin_conversations WHERE admin_id = ? AND user_id = ?"
  ).get(adminId, userId) as any;

  if (!conv) {
    const result = sqlite.prepare(
      "INSERT INTO admin_conversations (admin_id, user_id) VALUES (?, ?)"
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

  const msgs = sqlite.prepare(
    "SELECT * FROM admin_messages WHERE conversation_id = ? ORDER BY created_at ASC"
  ).all(convId) as any[];

  const result = msgs.map((m: any) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    isRead: !!m.is_read,
    createdAt: m.created_at,
  }));

  res.json({ messages: result, total: result.length, page: 1 });
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

// POST /admin-conversations/:id/messages
router.post("/admin-conversations/:id/messages", requireAuth, async (req, res) => {
  const convId = parseInt(req.params["id"]!);
  const { content } = req.body;
  const userId = req.user!.id;

  if (!content) {
    res.status(400).json({ error: "Validation error", message: "content is required" });
    return;
  }

  const conv = sqlite.prepare("SELECT * FROM admin_conversations WHERE id = ?").get(convId) as any;
  if (!conv || (conv.admin_id !== userId && conv.user_id !== userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = sqlite.prepare(
    "INSERT INTO admin_messages (conversation_id, sender_id, content, is_read) VALUES (?, ?, ?, 0)"
  ).run(convId, userId, content);

  sqlite.prepare(
    "UPDATE admin_conversations SET updated_at = ? WHERE id = ?"
  ).run(new Date().toISOString(), convId);

  const msg = sqlite.prepare("SELECT * FROM admin_messages WHERE id = ?").get(result.lastInsertRowid) as any;

  res.status(201).json({
    id: msg.id,
    conversationId: msg.conversation_id,
    senderId: msg.sender_id,
    content: msg.content,
    isRead: !!msg.is_read,
    createdAt: msg.created_at,
  });
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
