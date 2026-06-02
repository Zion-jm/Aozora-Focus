import type Database from "better-sqlite3";
import { sqlite } from "../db/index";

export type NotificationType =
  | "appointment_request"
  | "appointment_approved"
  | "appointment_rejected"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_no_show"
  | "appointment_new"
  | "dorm_approved"
  | "dorm_rejected"
  | "dorm_taken_down"
  | "id_verified"
  | "id_rejected"
  | "account_suspended"
  | "account_unsuspended"
  | "user_suspended"
  | "user_unsuspended"
  | "admin_warning"
  | "new_message"
  | "message_new"
  | "admin_message"
  | "support_ticket_resolved"
  | "dorm_review_received"
  | "user_review_received";

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export function createNotification({
  userId,
  type,
  title,
  body,
  relatedId,
  relatedType,
}: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  relatedId?: number;
  relatedType?: "dorm" | "appointment" | "conversation";
}) {
  try {
    sqlite
      .prepare(
        `INSERT INTO notifications (user_id, type, title, body, related_id, related_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(userId, type, title, body, relatedId ?? null, relatedType ?? null);
  } catch {
    // Non-fatal — notifications must never break the primary action
  }

  // Fire push in background (non-blocking)
  sendPushNotificationToUser(userId, title, body).catch(() => {});
}

export function notifyUser(
  db: Database.Database,
  userId: number,
  payload: NotificationPayload
): void {
  const { type, title, body, data = {} } = payload;

  try {
    db.prepare(
      "INSERT INTO notifications (user_id, type, title, body, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(userId, type, title, body, null, null);
  } catch {
    // Non-fatal
  }

  sendPushNotificationToUser(userId, title, body).catch(() => {});
}

export function notifyAllAdmins(
  db: Database.Database,
  payload: NotificationPayload
): void {
  const admins = db
    .prepare("SELECT id FROM users WHERE role = 'admin'")
    .all() as { id: number }[];
  for (const admin of admins) {
    notifyUser(db, admin.id, payload);
  }
}

async function sendPushNotificationToUser(
  userId: number,
  title: string,
  body: string
): Promise<void> {
  try {
    const rows = sqlite
      .prepare(`SELECT token FROM push_tokens WHERE user_id = ?`)
      .all(userId) as { token: string }[];

    if (rows.length === 0) return;

    const messages = rows.map(({ token }) => ({
      to: token,
      sound: "default" as const,
      title,
      body,
      priority: "high" as const,
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch {
    // Non-fatal — push delivery must never break the caller
  }
}
