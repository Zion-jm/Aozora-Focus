import { sqlite } from "../db/index";

export type NotificationType =
  | "appointment_request"
  | "appointment_approved"
  | "appointment_rejected"
  | "appointment_cancelled"
  | "appointment_completed"
  | "appointment_no_show"
  | "dorm_approved"
  | "dorm_rejected"
  | "dorm_taken_down"
  | "id_verified"
  | "id_rejected"
  | "account_suspended"
  | "account_unsuspended"
  | "admin_warning"
  | "new_message"
  | "admin_message"
  | "support_ticket_resolved"
  | "dorm_review_received"
  | "user_review_received";

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
import type Database from "better-sqlite3";

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Persist an in-app notification for a user and fire an Expo push
 * notification if the user has a registered push token.
 * The DB insert is synchronous; push is fire-and-forget.
 */
export function notifyUser(
  db: Database.Database,
  userId: number,
  payload: NotificationPayload
): void {
  const { type, title, body, data = {} } = payload;

  db.prepare(
    "INSERT INTO notifications (user_id, type, title, body, data) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, type, title, body, JSON.stringify(data));

  const row = db
    .prepare("SELECT expo_push_token FROM users WHERE id = ?")
    .get(userId) as { expo_push_token?: string | null } | undefined;

  if (row?.expo_push_token) {
    sendExpoPush(row.expo_push_token, title, body, data).catch(() => {});
  }
}

/**
 * Notify every admin account with the same payload.
 */
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

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data,
      sound: "default",
      priority: "high",
    }),
  });
}
