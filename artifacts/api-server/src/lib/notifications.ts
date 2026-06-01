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
}
