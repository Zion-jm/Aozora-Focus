import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationContext";
import { timeAgo } from "../../utils/time";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function getNotifIcon(type: string): { name: FeatherName; color: string } {
  switch (type) {
    case "appointment_new":        return { name: "calendar",        color: "#6366f1" };
    case "appointment_approved":   return { name: "check-circle",    color: "#10b981" };
    case "appointment_rejected":   return { name: "x-circle",        color: "#ef4444" };
    case "appointment_completed":  return { name: "check-square",    color: "#10b981" };
    case "appointment_no_show":    return { name: "user-x",          color: "#f59e0b" };
    case "appointment_cancelled":  return { name: "x-circle",        color: "#f59e0b" };
    case "appointment_reminder":   return { name: "clock",           color: "#6366f1" };
    case "admin_message":          return { name: "message-square",  color: "#6366f1" };
    case "admin_message_new":      return { name: "message-square",  color: "#6366f1" };
    case "dorm_approved":          return { name: "home",            color: "#10b981" };
    case "dorm_rejected":          return { name: "home",            color: "#ef4444" };
    case "dorm_taken_down":        return { name: "home",            color: "#ef4444" };
    case "dorm_submitted":         return { name: "home",            color: "#6366f1" };
    case "verification_approved":  return { name: "shield",          color: "#10b981" };
    case "verification_rejected":  return { name: "shield",          color: "#ef4444" };
    case "verification_submitted": return { name: "shield",          color: "#6366f1" };
    case "user_suspended":         return { name: "user-x",          color: "#ef4444" };
    case "user_unsuspended":       return { name: "user-check",      color: "#10b981" };
    case "user_warned":            return { name: "alert-triangle",  color: "#f59e0b" };
    case "support_ticket_new":     return { name: "help-circle",     color: "#6366f1" };
    case "support_ticket_resolved":return { name: "check-circle",    color: "#10b981" };
    case "review_new_dorm":        return { name: "star",            color: "#f59e0b" };
    case "review_new_user":        return { name: "star",            color: "#f59e0b" };
    case "report_new":             return { name: "flag",            color: "#f59e0b" };
    default:                       return { name: "bell",            color: "#6366f1" };
  }
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const markAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${BASE_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshUnreadCount();
    } catch {
      // ignore
    }
  };

  const isAdmin = user?.role === "admin";

  const ADMIN_MSG_TYPES = ["admin_message", "admin_message_new", "support_ticket_resolved"];
  const ACCOUNT_TYPES = ["account_suspended", "account_unsuspended", "admin_warning", "violation_logged"];
  const APPT_TYPES = ["appointment_request", "appointment_approved", "appointment_rejected",
    "appointment_cancelled", "appointment_completed", "appointment_no_show", "appointment_new",
    "appointment_reminder"];

  const handleTap = async (notif: any) => {
    if (!notif.isRead && token) {
      try {
        await fetch(`${BASE_URL}/api/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        refreshUnreadCount();
      } catch {
        // ignore
      }
    }

    const type: string = notif.type ?? "";

    // ── Support ticket routing ────────────────────────────────────────────────
    if (type === "support_ticket_new") {
      // Admin gets notified of a new ticket → open admin support queue
      router.push("/admin/support-tickets" as any);
      return;
    }
    if (type === "support_ticket_resolved") {
      // User gets notified their ticket was resolved
      if (notif.relatedType === "conversation" && notif.relatedId) {
        // Has a linked admin conversation → go directly to the thread
        router.push(`/admin-conversation/${notif.relatedId}` as any);
      } else {
        // No conversation (e.g. guest/email-only ticket) → go to My Tickets
        router.push("/my-tickets" as any);
      }
      return;
    }

    // ── All other notification types ─────────────────────────────────────────
    if (notif.relatedType === "support_ticket") {
      // Fallback: any other support_ticket relatedType → support queue for admin, my-tickets for users
      router.push(isAdmin ? "/admin/support-tickets" as any : "/my-tickets" as any);
    } else if (notif.relatedType === "appointment" && notif.relatedId) {
      router.push(`/appointment/${notif.relatedId}` as any);
    } else if (notif.relatedType === "dorm" && notif.relatedId) {
      router.push(`/dorm/${notif.relatedId}` as any);
    } else if (notif.relatedType === "conversation" && notif.relatedId) {
      if (ADMIN_MSG_TYPES.includes(type)) {
        router.push(`/admin-conversation/${notif.relatedId}` as any);
      } else {
        router.push(`/conversation/${notif.relatedId}` as any);
      }
    } else if (APPT_TYPES.includes(type)) {
      router.push("/(tabs)/appointments" as any);
    } else if (ADMIN_MSG_TYPES.includes(type)) {
      router.push("/(tabs)/messages" as any);
    } else if (ACCOUNT_TYPES.includes(type) || type.startsWith("violation_action_")) {
      router.push("/profile/violations" as any);
    } else if (type === "dorm_approved" || type === "dorm_rejected" || type === "dorm_taken_down") {
      router.push("/profile/my-dorms" as any);
    } else if (type === "id_verified" || type === "id_rejected") {
      router.push("/profile/verify" as any);
    } else if (type === "dorm_review_received") {
      router.push("/profile/my-dorms" as any);
    } else if (type === "user_review_received") {
      router.push("/profile/reviews" as any);
    }
  };

  const handleDelete = async (notifId: number) => {
    if (!token) return;
    try {
      await fetch(`${BASE_URL}/api/notifications/${notifId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      refreshUnreadCount();
    } catch {
      // ignore
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 3_000);
      return () => clearInterval(interval);
    }, [fetchNotifications])
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header — title only */}
      <View
        style={[
          styles.header,
          {
            paddingTop: (insets.top || 44) + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Notifications
        </Text>
      </View>

      {/* "Mark all read" bar — shown below header when there are unread items */}
      {unreadCount > 0 && !loading && (
        <View
          style={[
            styles.markAllBar,
            {
              backgroundColor: colors.primary + "0d",
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.markAllLeft}>
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
            <Text style={[styles.unreadLabel, { color: colors.mutedForeground }]}>
              unread
            </Text>
          </View>
          <TouchableOpacity
            onPress={markAllRead}
            activeOpacity={0.7}
            style={[styles.markAllBtn, { borderColor: colors.primary + "40" }]}
          >
            <Feather name="check-circle" size={13} color={colors.primary} />
            <Text style={[styles.markAllBtnText, { color: colors.primary }]}>
              Mark all read
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="bell-off" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            You'll be notified about visit updates, reviews, and account activity.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const { name: iconName, color: iconColor } = getNotifIcon(item.type);
            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  {
                    backgroundColor: item.isRead
                      ? colors.background
                      : colors.primary + "0d",
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => handleTap(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: iconColor + "20" },
                  ]}
                >
                  <Feather name={iconName} size={20} color={iconColor} />
                </View>

                <View style={styles.content}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.itemTitle,
                        {
                          color: colors.foreground,
                          fontWeight: item.isRead ? "400" : "700",
                          flex: 1,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.timeAgo, { color: colors.mutedForeground }]}
                    >
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.itemBody, { color: colors.mutedForeground }]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                </View>

                {!item.isRead && (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}

                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.deleteBtn}
                >
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  markAllBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  markAllLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  unreadLabel: {
    fontSize: 13,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "600" },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemTitle: { fontSize: 14 },
  timeAgo: { fontSize: 12, flexShrink: 0 },
  itemBody: { fontSize: 13, lineHeight: 18 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
    alignSelf: "center",
  },
  deleteBtn: {
    padding: 4,
    flexShrink: 0,
    alignSelf: "center",
  },
});
