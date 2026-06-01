import { Router } from "express";
import { sqlite } from "../db/index";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, (req, res) => {
  const userId = req.user!.id;

  const rows = sqlite
    .prepare(
      `SELECT id, user_id as userId, type, title, body,
              is_read as isRead, related_id as relatedId,
              related_type as relatedType, created_at as createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    )
    .all(userId) as any[];

  const notifications = rows.map((r) => ({
    ...r,
    isRead: r.isRead === 1,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({ notifications, unreadCount });
});

router.post("/notifications/read-all", requireAuth, (req, res) => {
  const userId = req.user!.id;
  sqlite
    .prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?")
    .run(userId);
  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireAuth, (req, res) => {
  const userId = req.user!.id;
  const id = parseInt(req.params["id"]!);

  const row = sqlite
    .prepare("SELECT id FROM notifications WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  sqlite
    .prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")
    .run(id);
  res.json({ success: true });
});

router.delete("/notifications/:id", requireAuth, (req, res) => {
  const userId = req.user!.id;
  const id = parseInt(req.params["id"]!);

  const row = sqlite
    .prepare("SELECT id FROM notifications WHERE id = ? AND user_id = ?")
    .get(id, userId);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  sqlite.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  res.json({ success: true });
});

export default router;
