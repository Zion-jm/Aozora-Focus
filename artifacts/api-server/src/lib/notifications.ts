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
  | "id_verified"
  | "id_rejected"
  | "account_suspended"
  | "account_unsuspended";

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
}
