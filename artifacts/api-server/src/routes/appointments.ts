import { Router } from "express";
import { db, sqlite } from "../db/index";
import { appointments, dorms, users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { notifyUser } from "../lib/notifications";

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
    res.status(403).json({ error: "Forbidden", message: "Admins cannot access appointment records" });
    return;
  }

  if (status) {
    allAppointments = allAppointments.filter((a) => a.status === status);
  }

  const enriched = await Promise.all(
    allAppointments.map(async (appt) => {
      const student = await db.select().from(users).where(eq(users.id, appt.studentId)).get();
      const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();
      const base = serializeAppointment(appt, student, dorm);

      let hasReview = false;
      if (appt.status === "completed") {
        if (user.role === "student") {
          const r = sqlite.prepare(
            "SELECT id FROM dorm_reviews WHERE dorm_id = ? AND reviewer_id = ? LIMIT 1"
          ).get(appt.dormId, user.id);
          hasReview = !!r;
        } else if (user.role === "owner") {
          const r = sqlite.prepare(
            "SELECT id FROM user_reviews WHERE reviewed_user_id = ? AND reviewer_id = ? LIMIT 1"
          ).get(appt.studentId, user.id);
          hasReview = !!r;
        }
      }

      return { ...base, hasReview };
    })
  );

  res.json({ appointments: enriched, total: enriched.length });
});

router.get("/dorms/:dormId/can-book", requireAuth, (req, res) => {
  const user = req.user!;
  const dormId = parseInt(req.params["dormId"]!);

  if (user.role !== "student") {
    res.json({ canBook: false, reason: "Only students can book visits" });
    return;
  }

  const active = sqlite.prepare(
    "SELECT id, status FROM appointments WHERE student_id = ? AND dorm_id = ? AND status IN ('pending', 'approved') LIMIT 1"
  ).get(user.id, dormId) as any;

  if (active) {
    const label = active.status === "approved" ? "scheduled" : "pending";
    res.json({
      canBook: false,
      reason: `You already have a ${label} visit for this dorm`,
      appointmentId: active.id,
      appointmentStatus: active.status,
    });
    return;
  }

  res.json({ canBook: true });
});

router.post("/appointments", requireAuth, async (req, res) => {
  const { dormId, preferredDate, preferredTime, message } = req.body;

  if (!dormId || !preferredDate || !preferredTime) {
    res.status(400).json({ error: "Validation error", message: "dormId, preferredDate, preferredTime are required" });
    return;
  }

  if (req.user!.role === "student") {
    const active = sqlite.prepare(
      "SELECT id FROM appointments WHERE student_id = ? AND dorm_id = ? AND status IN ('pending', 'approved') LIMIT 1"
    ).get(req.user!.id, dormId);

    if (active) {
      res.status(409).json({
        error: "Active booking exists",
        message: "You already have a pending or scheduled visit for this dorm. Please wait until it is completed, cancelled, or resolved before booking again.",
      });
      return;
    }
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

  if (dorm) {
    notifyUser(sqlite, dorm.ownerId, {
      type: "appointment_new",
      title: "New Visit Request 📅",
      body: `${req.user!.fullName} wants to visit ${dorm.name} on ${appt.preferredDate}.`,
      data: { path: `/appointment/${appt.id}` },
    });
  }

  res.status(201).json(serializeAppointment(appt, student, dorm));
});

router.get("/appointments/:appointmentId", requireAuth, async (req, res) => {
  const user = req.user!;

  if (user.role === "admin") {
    res.status(403).json({ error: "Forbidden", message: "Admins cannot access appointment records" });
    return;
  }

  const id = parseInt(req.params["appointmentId"]!);
  const appt = await db.select().from(appointments).where(eq(appointments.id, id)).get();

  if (!appt) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();

  if (user.role === "student" && appt.studentId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (user.role === "owner" && dorm?.ownerId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const student = await db.select().from(users).where(eq(users.id, appt.studentId)).get();

  res.json(serializeAppointment(appt, student, dorm));
});

router.put("/appointments/:appointmentId", requireAuth, async (req, res) => {
  const user = req.user!;
  const id = parseInt(req.params["appointmentId"]!);
  const { status, ownerNote } = req.body;

  const appt = await db.select().from(appointments).where(eq(appointments.id, id)).get();
  if (!appt) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const dorm = await db.select().from(dorms).where(eq(dorms.id, appt.dormId)).get();

  // Students can cancel their own pending or approved appointments
  if (status === "cancelled") {
    if (user.role !== "student" || appt.studentId !== user.id) {
      res.status(403).json({ error: "Forbidden", message: "Only the student can cancel their appointment" });
      return;
    }
    if (appt.status !== "pending" && appt.status !== "approved") {
      res.status(400).json({ error: "Cannot cancel", message: "Only pending or approved appointments can be cancelled" });
      return;
    }
  // Owners can mark an approved appointment as completed or no_show
  } else if (status === "completed" || status === "no_show") {
    if (user.role !== "owner" || dorm?.ownerId !== user.id) {
      res.status(403).json({ error: "Forbidden", message: "Only the dorm owner can mark a visit outcome" });
      return;
    }
    if (appt.status !== "approved") {
      res.status(400).json({ error: "Cannot update", message: "Only approved appointments can be marked as completed or no-show" });
      return;
    }
  // Owners handle approve / reject
  } else {
    if (!dorm || dorm.ownerId !== user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const result = await db.update(appointments).set({
    status,
    ownerNote: ownerNote ?? null,
    updatedAt: new Date().toISOString(),
  }).where(eq(appointments.id, id)).returning();

  const updated = result[0]!;
  const student = await db.select().from(users).where(eq(users.id, updated.studentId)).get();

  // ── Notifications based on status change ─────────────────────────────────
  if (status === "approved") {
    notifyUser(sqlite, updated.studentId, {
      type: "appointment_approved",
      title: "Visit Approved ✅",
      body: `Your visit to ${dorm?.name ?? "the dorm"} on ${updated.preferredDate} at ${updated.preferredTime} has been approved.`,
      data: { path: `/appointment/${updated.id}` },
    });
  } else if (status === "rejected") {
    notifyUser(sqlite, updated.studentId, {
      type: "appointment_rejected",
      title: "Visit Request Declined",
      body: `Your visit request for ${dorm?.name ?? "the dorm"} was not approved.${updated.ownerNote ? ` Note: ${updated.ownerNote}` : ""}`,
      data: { path: `/appointment/${updated.id}` },
    });
  } else if (status === "completed") {
    notifyUser(sqlite, updated.studentId, {
      type: "appointment_completed",
      title: "Visit Completed 🏠",
      body: `Your visit to ${dorm?.name ?? "the dorm"} is marked complete. Share your experience with a review!`,
      data: { path: `/appointment/${updated.id}` },
    });
  } else if (status === "no_show") {
    notifyUser(sqlite, updated.studentId, {
      type: "appointment_no_show",
      title: "Missed Visit",
      body: `Your visit to ${dorm?.name ?? "the dorm"} was marked as a no-show.`,
      data: { path: `/appointment/${updated.id}` },
    });
  } else if (status === "cancelled" && dorm) {
    notifyUser(sqlite, dorm.ownerId, {
      type: "appointment_cancelled",
      title: "Visit Cancelled",
      body: `${student?.fullName ?? "A student"} cancelled their visit to ${dorm.name}.`,
      data: { path: `/appointment/${updated.id}` },
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  res.json(serializeAppointment(updated, student, dorm));
});

export default router;
