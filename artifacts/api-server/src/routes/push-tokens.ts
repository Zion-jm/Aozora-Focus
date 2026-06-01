import { Router } from "express";
import { sqlite } from "../db/index";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/api/push-tokens", authenticate, (req, res) => {
  const userId = (req as any).userId as number;
  const { token, platform } = req.body as { token: string; platform?: string };

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token required" });
    return;
  }

  sqlite
    .prepare(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, token) DO UPDATE SET
         platform = excluded.platform,
         updated_at = datetime('now')`
    )
    .run(userId, token, platform ?? null);

  res.json({ success: true });
});

router.delete("/api/push-tokens", authenticate, (req, res) => {
  const userId = (req as any).userId as number;
  const { token } = req.body as { token: string };

  if (!token) {
    res.status(400).json({ error: "token required" });
    return;
  }

  sqlite
    .prepare(`DELETE FROM push_tokens WHERE user_id = ? AND token = ?`)
    .run(userId, token);

  res.json({ success: true });
});

export default router;
