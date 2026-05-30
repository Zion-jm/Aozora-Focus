import { Router } from "express";
import { db } from "../db/index";
import { favorites, dorms } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/favorites", requireAuth, async (req, res) => {
  const userId = req.user!.id;
  const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, userId)).all();
  const dormIds = userFavorites.map((f) => f.dormId);

  const dormList = await Promise.all(
    dormIds.map((id) => db.select().from(dorms).where(eq(dorms.id, id)).get())
  );

  const validDorms = dormList.filter(Boolean).map((d) => ({
    ...d!,
    amenities: JSON.parse(d!.amenities || "[]"),
  }));

  res.json({ dorms: validDorms, total: validDorms.length, page: 1, totalPages: 1 });
});

router.post("/favorites", requireAuth, async (req, res) => {
  const { dormId } = req.body;
  const userId = req.user!.id;

  if (!dormId) {
    res.status(400).json({ error: "Validation error", message: "dormId is required" });
    return;
  }

  const existing = await db.select().from(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.dormId, dormId))
  ).get();

  if (existing) {
    res.status(201).json({ message: "Already in favorites" });
    return;
  }

  await db.insert(favorites).values({ userId, dormId });
  res.status(201).json({ message: "Added to favorites" });
});

router.delete("/favorites/:dormId", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const userId = req.user!.id;

  await db.delete(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.dormId, dormId))
  );

  res.json({ message: "Removed from favorites" });
});

router.get("/favorites/check/:dormId", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const userId = req.user!.id;

  const existing = await db.select().from(favorites).where(
    and(eq(favorites.userId, userId), eq(favorites.dormId, dormId))
  ).get();

  res.json({ isFavorited: !!existing });
});

export default router;
