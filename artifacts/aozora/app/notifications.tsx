import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useDeleteNotification,
  getGetNotificationsQueryKey,
  type Notification,
} from "@workspace/api-client-react";

function notificationIcon(type: Notification["type"]): { name: React.ComponentProps<typeof Feather>["name"]; color: string } {
  switch (type) {
    case "appointment_request":
      return { name: "calendar", color: "#4f46e5" };
    case "appointment_approved":
      return { name: "check-circle", color: "#10b981" };
    case "appointment_rejected":
      return { name: "x-circle", color: "#ef4444" };
    case "appointment_cancelled":
      return { name: "slash", color: "#6b7280" };
    case "appointment_completed":
      return { name: "award", color: "#10b981" };
    case "appointment_no_show":
      return { name: "user-x", color: "#f59e0b" };
    case "dorm_approved":
      return { name: "home", color: "#10b981" };
    case "dorm_rejected":
      return { name: "home", color: "#ef4444" };
    case "dorm_taken_down":
      return { name: "alert-triangle", color: "#ef4444" };
    case "id_verified":
      return { name: "shield", color: "#10b981" };
    case "id_rejected":
      return { name: "shield-off", color: "#ef4444" };
    case "account_suspended":
      return { name: "lock", color: "#ef4444" };
    case "account_unsuspended":
      return { name: "unlock", color: "#10b981" };
    case "admin_warning":
      return { name: "alert-octagon", color: "#f59e0b" };
    case "new_message":
      return { name: "message-circle", color: "#4f46e5" };
    case "admin_message":
      return { name: "message-square", color: "#6366f1" };
    case "support_ticket_resolved":
      return { name: "check-square", color: "#10b981" };
    case "dorm_review_received":
      return { name: "star", color: "#f59e0b" };
    case "user_review_received":
      return { name: "star", color: "#f59e0b" };
    default:
      return { name: "bell", color: "#4f46e5" };
  }
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function NotificationItem({
  item,
  onPress,
  onDelete,
  colors,
}: {
  item: Notification;
  onPress: (n: Notification) => void;
  onDelete: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { name: iconName, color: iconColor } = notificationIcon(item.type);

  return (
    <Pressable
      style={[
        styles.item,
        {
          backgroundColor: item.isRead ? colors.card : colors.primary + "0a",
          borderBottomColor: colors.border,
        },
      ]}
      onPress={() => onPress(item)}
      android_ripple={{ color: colors.primary + "20" }}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
        <Feather name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground, fontWeight: item.isRead ? "500" : "700" }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
        <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatRelativeTime(item.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
      </TouchableOpacity>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useGetNotifications({ query: { refetchInterval: 8_000 } });
  const notifications: Notification[] = (data?.notifications ?? []) as Notification[];
  const unreadCount = data?.unreadCount ?? 0;

  const { mutate: markAllRead } = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const { mutate: markOneRead } = useMarkNotificationRead({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const { mutate: deleteOne } = useDeleteNotification({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    },
  });

  const ADMIN_CONV_TYPES: Notification["type"][] = ["admin_message", "admin_warning", "support_ticket_resolved"];

  const handlePress = useCallback(
    (n: Notification) => {
      if (!n.isRead) {
        markOneRead({ id: n.id });
      }
      if (n.relatedType === "appointment" && n.relatedId) {
        router.push(`/appointment/${n.relatedId}` as any);
      } else if (n.relatedType === "dorm" && n.relatedId) {
        router.push(`/dorm/${n.relatedId}` as any);
      } else if (n.relatedType === "conversation" && n.relatedId) {
        if (ADMIN_CONV_TYPES.includes(n.type)) {
          router.push(`/admin-conversation/${n.relatedId}` as any);
        } else {
          router.push(`/conversation/${n.relatedId}` as any);
        }
      }
    },
    [markOneRead]
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteOne({ id });
    },
    [deleteOne]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={() => markAllRead()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.markAllBtn, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="bell-off" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up!</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            You have no notifications yet.{"\n"}We'll let you know when something happens.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={handlePress}
              onDelete={handleDelete}
              colors={colors}
            />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700" },
  markAllBtn: { fontSize: 13, fontWeight: "600", width: 80, textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textWrap: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { flex: 1, fontSize: 15 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  body: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 11, marginTop: 2 },
  deleteBtn: { padding: 4, marginTop: 2 },
});
