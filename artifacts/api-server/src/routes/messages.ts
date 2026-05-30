import { Router } from "express";
import { db } from "../db/index";
import { conversations, messages, dorms, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function serializeConversation(conv: typeof conversations.$inferSelect, currentUserId: number) {
  const dorm = await db.select().from(dorms).where(eq(dorms.id, conv.dormId)).get();
  const otherId = conv.studentId === currentUserId ? conv.ownerId : conv.studentId;
  const other = await db.select().from(users).where(eq(users.id, otherId)).get();
  const allMsgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id)).all();
  // Sort chronologically so lastMsg is always the most recent
  allMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const lastMsg = allMsgs.length ? allMsgs[allMsgs.length - 1] : null;
  const unread = allMsgs.filter((m) => !m.isRead && m.senderId !== currentUserId).length;

  return {
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

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const allConvs = await db.select().from(conversations).all();
  const myConvs = allConvs.filter(
    (c) => c.studentId === userId || c.ownerId === userId
  );

  const enriched = await Promise.all(myConvs.map((c) => serializeConversation(c, userId)));
  enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const totalUnread = enriched.reduce((sum, c) => sum + c.unreadCount, 0);

  res.json({ conversations: enriched, totalUnread });
});

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

  // Enrich messages with sender info
  const enriched = await Promise.all(
    paginated.map(async (msg) => {
      const sender = await db.select().from(users).where(eq(users.id, msg.senderId)).get();
      return {
        ...msg,
        sender: sender ? {
          id: sender.id,
          fullName: sender.fullName,
          avatarUrl: sender.avatarUrl,
          role: sender.role,
        } : null,
      };
    })
  );

  res.json({ messages: enriched, total, page });
});

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

  const msg = result[0]!;
  const sender = await db.select().from(users).where(eq(users.id, msg.senderId)).get();

  res.status(201).json({
    ...msg,
    sender: sender ? {
      id: sender.id,
      fullName: sender.fullName,
      avatarUrl: sender.avatarUrl,
      role: sender.role,
    } : null,
  });
});

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

export default router;
