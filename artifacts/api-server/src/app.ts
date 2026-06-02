import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { initializeDatabase, sqlite } from "./db/index";
import { createNotification } from "./lib/notifications";

const app: Express = express();

// Disable ETags so API responses are never served from cache (304s would hide
// state changes like closed_at being updated when a ticket is resolved)
app.set("etag", false);

initializeDatabase();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// ─── Appointment reminder scheduler ──────────────────────────────────────────
// Tracks which appointment IDs have already been reminded (in-memory, resets on restart).
const sentReminderIds = new Set<number>();

function checkAppointmentReminders() {
  try {
    const now = new Date();
    const windowLow  = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 h from now
    const windowHigh = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 h from now

    const upcoming = sqlite
      .prepare(
        `SELECT a.id, a.student_id, a.preferred_date, a.preferred_time, d.name AS dorm_name
         FROM appointments a
         JOIN dorms d ON d.id = a.dorm_id
         WHERE a.status = 'approved'`
      )
      .all() as { id: number; student_id: number; preferred_date: string; preferred_time: string; dorm_name: string }[];

    for (const appt of upcoming) {
      if (sentReminderIds.has(appt.id)) continue;

      const apptDate = new Date(`${appt.preferred_date}T${appt.preferred_time}:00`);
      if (apptDate >= windowLow && apptDate <= windowHigh) {
        createNotification({
          userId: appt.student_id,
          type: "appointment_reminder",
          title: "Visit Tomorrow",
          body: `Reminder: your visit to ${appt.dorm_name} is tomorrow at ${appt.preferred_time}. Don't be late!`,
          relatedId: appt.id,
          relatedType: "appointment",
        });
        sentReminderIds.add(appt.id);
        logger.info({ appointmentId: appt.id }, "Appointment reminder sent");
      }
    }
  } catch (err) {
    logger.error({ err }, "Appointment reminder check failed");
  }
}

// Run once on startup, then every hour
checkAppointmentReminders();
setInterval(checkAppointmentReminders, 60 * 60 * 1000);

export default app;
