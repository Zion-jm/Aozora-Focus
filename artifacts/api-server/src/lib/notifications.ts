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
