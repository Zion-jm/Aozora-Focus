import { Router } from "express";
import { db } from "../db/index";
import { appointments, dorms, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function serializeAppointment(
  appt: typeof appointments.$inferSelect,
  student: typeof users.$inferSelect | undefined,
  dorm: typeof dorms.$inferSelect | undefined
) {
  return {
    id: appt.id,
    studentId: appt.studentId,
    dormId: appt.dormId,
    preferredDate: appt.preferredDate,
    preferredTime: appt.preferredTime,
    message: appt.message,
    status: appt.status,
    ownerNote: appt.ownerNote,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
    student: student ? {
      id: student.id,
      fullName: student.fullName,
      role: student.role,
      verificationStatus: student.verificationStatus,
      avatarUrl: student.avatarUrl,
    } : null,
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
  };
}

router.get("/appointments", requireAuth, async (req, res) => {
  const user = req.user!;
  const { status } = req.query as Record<string, string>;

  let allAppointments: (typeof appointments.$inferSelect)[];

  if (user.role === "student") {
    let q = db.select().from(appointments).where(eq(appointments.studentId, user.id)).$dynamic();
    allAppointments = await q.all();
  } else if (user.role === "owner") {
    const myDorms = await db.select().from(dorms).where(eq(dorms.ownerId, user.id)).all();
    const dormIds = myDorms.map((d) => d.id);
    if (dormIds.length === 0) {
      res.json({ appointments: [], total: 0 });
      return;
    }
    allAppointments = await db.select().from(appointments).all();
    allAppointments = allAppointments.filter((a) => dormIds.includes(a.dormId));
  } else {
    allAppointments = await db.select().from(appointments).all();
  }

  if (status) {
    allAppointments = allAppointments.filter((a) => a.status === status);
  }

  const enriched = await Promise.all(
    allAppointments.map(async (appt) => {
      const student = await db.select().from(users).where(eq(users.id, appt.studentId)).get();
      const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();
      return serializeAppointment(appt, student, dorm);
    })
  );

  res.json({ appointments: enriched, total: enriched.length });
});

router.post("/appointments", requireAuth, async (req, res) => {
  const { dormId, preferredDate, preferredTime, message } = req.body;

  if (!dormId || !preferredDate || !preferredTime) {
    res.status(400).json({ error: "Validation error", message: "dormId, preferredDate, preferredTime are required" });
    return;
  }

  const result = await db.insert(appointments).values({
    studentId: req.user!.id,
    dormId,
    preferredDate,
    preferredTime,
    message: message ?? null,
    status: "pending",
  }).returning();

  const appt = result[0]!;
  const student = await db.select().from(users).where(eq(users.id, appt.studentId)).get();
  const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();

  res.status(201).json(serializeAppointment(appt, student, dorm));
});

router.get("/appointments/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(req.params["appointmentId"]!);
  const appt = await db.select().from(appointments).where(eq(appointments.id, id)).get();

  if (!appt) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const student = await db.select().from(users).where(eq(users.id, appt.studentId)).get();
  const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();

  res.json(serializeAppointment(appt, student, dorm));
});

router.put("/appointments/:appointmentId", requireAuth, async (req, res) => {
  const id = parseInt(req.params["appointmentId"]!);
  const { status, ownerNote } = req.body;

  const appt = await db.select().from(appointments).where(eq(appointments.id, id)).get();
  if (!appt) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();
  if (!dorm || (dorm.ownerId !== req.user!.id && req.user!.role !== "admin")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await db.update(appointments).set({
    status,
    ownerNote: ownerNote ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(appointments.id, id)).returning();

  const updated = result[0]!;
  const student = await db.select().from(users).where(eq(users.id, updated.studentId)).get();

  res.json(serializeAppointment(updated, student, dorm));
});

export default router;
