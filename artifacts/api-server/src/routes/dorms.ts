import { Router } from "express";
import { db, sqlite } from "../db/index";
import { dorms, dormPhotos, favorites, users } from "../db/schema";
import { eq, and, gte, lte, like, desc, asc, sql, or } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import { notifyAllAdmins } from "../lib/notifications";

const router = Router();

function parseDorm(d: typeof dorms.$inferSelect) {
  return {
    ...d,
    amenities: JSON.parse(d.amenities || "[]") as string[],
  };
}

router.get("/dorms/stats", async (_req, res) => {
  const allDorms = await db.select().from(dorms).where(eq(dorms.status, "approved")).all();
  const totalAvailableBeds = allDorms.reduce((sum, d) => sum + d.availableBeds, 0);
  const rents = allDorms.map((d) => d.monthlyRent);
  const averageRent = rents.length ? rents.reduce((a, b) => a + b, 0) / rents.length : 0;

  res.json({
    totalListings: allDorms.length,
    approvedListings: allDorms.length,
    totalAvailableBeds,
    averageRent: Math.round(averageRent),
    rentRangeMin: rents.length ? Math.min(...rents) : 0,
    rentRangeMax: rents.length ? Math.max(...rents) : 0,
  });
});

router.get("/dorms/my-listings", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const ownerId = req.user!.id;
  const myDorms = await db.select().from(dorms).where(eq(dorms.ownerId, ownerId)).orderBy(desc(dorms.createdAt)).all();

  res.json({
    dorms: myDorms.map(parseDorm),
    total: myDorms.length,
    page: 1,
    totalPages: 1,
  });
});

router.get("/dorms", async (req, res) => {
  const {
    search, minRent, maxRent, hasAvailableBeds,
    sortBy, page = "1", limit = "20", ownerId, genderPolicy,
  } = req.query as Record<string, string>;

  let query = db.select().from(dorms).where(eq(dorms.status, "approved")).$dynamic();

  const conditions = [eq(dorms.status, "approved")];

  if (ownerId) conditions.push(eq(dorms.ownerId, parseInt(ownerId)));

  if (search) {
    conditions.push(
      or(
        like(dorms.name, `%${search}%`),
        like(dorms.address, `%${search}%`),
        like(dorms.description, `%${search}%`)
      )!
    );
  }
  if (minRent) conditions.push(gte(dorms.monthlyRent, parseFloat(minRent)));
  if (maxRent) conditions.push(lte(dorms.monthlyRent, parseFloat(maxRent)));
  if (hasAvailableBeds === "true") conditions.push(gte(dorms.availableBeds, 1));
  if (genderPolicy && genderPolicy !== "any") conditions.push(eq(dorms.genderPolicy, genderPolicy));

  const allApproved = await db.select().from(dorms).where(
    conditions.length > 1 ? and(...conditions) : conditions[0]
  ).all();

  let sorted = [...allApproved];
  if (sortBy === "price_asc") sorted.sort((a, b) => a.monthlyRent - b.monthlyRent);
  else if (sortBy === "price_desc") sorted.sort((a, b) => b.monthlyRent - a.monthlyRent);
  else if (sortBy === "rating_desc") sorted.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
  else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const total = sorted.length;
  const paginated = sorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.json({
    dorms: paginated.map(parseDorm),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

router.post("/dorms", requireAuth, requireRole("owner", "admin"), async (req, res) => {
  const {
    name, description, monthlyRent, address,
    latitude, longitude, amenities, totalRooms,
    bedsPerRoom, availableBeds, coverPhotoUrl, nearbyLandmark, genderPolicy, proofOfOwnershipUrl,
  } = req.body;

  if (!name || !monthlyRent || !address || !totalRooms || !bedsPerRoom || availableBeds === undefined) {
    res.status(400).json({ error: "Validation error", message: "Missing required fields" });
    return;
  }

  const result = await db.insert(dorms).values({
    ownerId: req.user!.id,
    name,
    description: description ?? "",
    monthlyRent,
    address,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    amenities: JSON.stringify(amenities ?? []),
    totalRooms,
    bedsPerRoom,
    availableBeds,
    status: "pending",
    coverPhotoUrl: coverPhotoUrl ?? null,
    nearbyLandmark: nearbyLandmark ?? null,
    genderPolicy: genderPolicy ?? "any",
    proofOfOwnershipUrl: proofOfOwnershipUrl ?? null,
  }).returning();

  notifyAllAdmins(sqlite, {
    type: "dorm_submitted",
    title: "New Listing Pending Review 🏠",
    body: `${req.user!.fullName} submitted "${name}" for approval.`,
    data: { path: "/admin/dorms" },
  });

  res.status(201).json(parseDorm(result[0]!));
});

router.get("/dorms/:dormId", optionalAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();

  if (!dorm) {
    res.status(404).json({ error: "Not found", message: "Dorm not found" });
    return;
  }

  const photos = await db.select().from(dormPhotos).where(eq(dormPhotos.dormId, dormId)).all();
  const owner = await db.select().from(users).where(eq(users.id, dorm.ownerId)).get();

  let isFavorited = false;
  if (req.user) {
    const fav = await db.select().from(favorites)
      .where(and(eq(favorites.userId, req.user.id), eq(favorites.dormId, dormId)))
      .get();
    isFavorited = !!fav;
  }

  res.json({
    ...parseDorm(dorm),
    owner: owner ? {
      id: owner.id,
      fullName: owner.fullName,
      role: owner.role,
      verificationStatus: owner.verificationStatus,
      avatarUrl: owner.avatarUrl,
    } : null,
    photos,
    isFavorited,
  });
});

router.put("/dorms/:dormId", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();

  if (!dorm) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (dorm.ownerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, description, monthlyRent, address, latitude, longitude, amenities, totalRooms, bedsPerRoom, availableBeds, coverPhotoUrl, nearbyLandmark, genderPolicy, proofOfOwnershipUrl } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (monthlyRent !== undefined) updates.monthlyRent = monthlyRent;
  if (address !== undefined) updates.address = address;
  if (latitude !== undefined) updates.latitude = latitude;
  if (longitude !== undefined) updates.longitude = longitude;
  if (amenities !== undefined) updates.amenities = JSON.stringify(amenities);
  if (totalRooms !== undefined) updates.totalRooms = totalRooms;
  if (bedsPerRoom !== undefined) updates.bedsPerRoom = bedsPerRoom;
  if (availableBeds !== undefined) updates.availableBeds = availableBeds;
  if (coverPhotoUrl !== undefined) updates.coverPhotoUrl = coverPhotoUrl;
  if (nearbyLandmark !== undefined) updates.nearbyLandmark = nearbyLandmark;
  if (genderPolicy !== undefined) updates.genderPolicy = genderPolicy;
  if (proofOfOwnershipUrl !== undefined) updates.proofOfOwnershipUrl = proofOfOwnershipUrl;

  const result = await db.update(dorms).set(updates).where(eq(dorms.id, dormId)).returning();
  res.json(parseDorm(result[0]!));
});

router.delete("/dorms/:dormId", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();

  if (!dorm) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (dorm.ownerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(dorms).where(eq(dorms.id, dormId));
  res.json({ message: "Dorm deleted" });
});

router.post("/dorms/:dormId/photos", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const { url, caption, order = 0 } = req.body;

  if (!url) {
    res.status(400).json({ error: "Validation error", message: "url is required" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();
  if (!dorm) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (dorm.ownerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await db.insert(dormPhotos).values({ dormId, url, caption: caption ?? null, order }).returning();
  res.status(201).json(result[0]);
});

router.delete("/dorms/:dormId/photos/:photoId", requireAuth, async (req, res) => {
  const dormId = parseInt(req.params["dormId"]!);
  const photoId = parseInt(req.params["photoId"]!);

  const dorm = await db.select().from(dorms).where(eq(dorms.id, dormId)).get();
  if (!dorm) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (dorm.ownerId !== req.user!.id && req.user!.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(dormPhotos).where(and(eq(dormPhotos.id, photoId), eq(dormPhotos.dormId, dormId)));
  res.json({ message: "Photo deleted" });
});

export default router;
