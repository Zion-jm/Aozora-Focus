export type NotifRouteResult =
  | { kind: "push"; path: string }
  | { kind: "toast" }
  | { kind: "none" };

export function resolveNotifRoute(
  notif: {
    type: string;
    relatedType?: string | null;
    relatedId?: number | null;
  },
  role: string
): NotifRouteResult {
  const type = notif.type ?? "";
  const relatedType = notif.relatedType ?? null;
  const relatedId = notif.relatedId ?? null;

  const ADMIN_MSG_TYPES = ["admin_message", "admin_message_new"];
  if (ADMIN_MSG_TYPES.includes(type)) {
    if (relatedType === "conversation" && relatedId) {
      return { kind: "push", path: `/admin-conversation/${relatedId}` };
    }
    return { kind: "none" };
  }

  if (type === "message_new" || type === "new_message") {
    if (relatedType === "conversation" && relatedId) {
      return { kind: "push", path: `/conversation/${relatedId}` };
    }
    return { kind: "none" };
  }

  if (relatedType === "appointment" && relatedId) {
    return { kind: "push", path: `/appointment/${relatedId}` };
  }
  if (relatedType === "dorm" && relatedId) {
    return { kind: "push", path: `/dorm/${relatedId}` };
  }
  if (relatedType === "conversation" && relatedId) {
    const ADMIN_CONV = ["support_ticket_resolved", "admin_message", "admin_message_new"];
    if (ADMIN_CONV.includes(type)) {
      return { kind: "push", path: `/admin-conversation/${relatedId}` };
    }
    return { kind: "none" };
  }
  if (relatedType === "support_ticket" && relatedId) {
    return { kind: "push", path: role === "admin" ? "/admin/support-tickets" : "/my-tickets" };
  }

  if (type.startsWith("appointment_")) {
    return { kind: "push", path: "/(tabs)/appointments" };
  }

  const VIOLATION_TYPES = ["account_suspended", "account_unsuspended", "admin_warning", "violation_logged"];
  if (VIOLATION_TYPES.includes(type) || type.startsWith("violation_action_")) {
    return { kind: "push", path: "/profile/violations" };
  }

  if (type === "user_suspended" || type === "user_unsuspended" || type === "user_warned") {
    if (role === "admin") return { kind: "push", path: "/admin/suspended-users" };
    return { kind: "push", path: "/profile/violations" };
  }

  if (type === "dorm_approved" || type === "dorm_rejected" || type === "dorm_taken_down") {
    if (role === "admin") return { kind: "push", path: "/admin/dorms" };
    return { kind: "push", path: "/profile/my-dorms" };
  }
  if (type === "dorm_submitted") {
    if (role === "admin") return { kind: "push", path: "/admin/dorms" };
    return { kind: "toast" };
  }

  if (type === "id_verified" || type === "id_rejected" ||
      type === "verification_approved" || type === "verification_rejected") {
    return { kind: "push", path: "/profile/verify" };
  }
  if (type === "verification_submitted") {
    if (role === "admin") return { kind: "push", path: "/admin/verifications" };
    return { kind: "toast" };
  }

  if (type === "support_ticket_new") {
    return { kind: "push", path: role === "admin" ? "/admin/support-tickets" : "/my-tickets" };
  }
  if (type === "support_ticket_resolved" || type === "support_ticket_opened") {
    return { kind: "push", path: "/my-tickets" };
  }

  if (type === "dorm_review_received" || type === "review_new_dorm") {
    return { kind: "push", path: "/profile/my-dorms" };
  }
  if (type === "user_review_received" || type === "review_new_user") {
    return { kind: "push", path: "/profile/reviews" };
  }

  if (type === "report_new") {
    if (role === "admin") return { kind: "push", path: "/admin/reports" };
    return { kind: "toast" };
  }

  return { kind: "toast" };
}
