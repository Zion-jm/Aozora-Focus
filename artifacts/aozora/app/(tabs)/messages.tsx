import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { getGetConversationsQueryKey, useGetConversations } from "@workspace/api-client-react";

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isRefetching } = useGetConversations({
    query: { queryKey: getGetConversationsQueryKey() },
  });

  const conversations = data?.conversations || [];
  const totalUnread = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 40,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Messages</Text>
          {totalUnread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          Chat with dorm owners and students
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.destructive} />
          <Text style={[{ color: colors.destructive, fontSize: 15 }]}>Failed to load messages</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[
                styles.item,
                { backgroundColor: colors.card, borderBottomColor: colors.border },
                item.unreadCount > 0 && { backgroundColor: colors.primary + "08" },
              ]}
              onPress={() => router.push(`/conversation/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item.otherParticipant?.fullName || "U")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemTop}>
                  <Text
                    style={[
                      styles.participantName,
                      { color: colors.foreground },
                      item.unreadCount > 0 && { fontWeight: "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.otherParticipant?.fullName || "Unknown"}
                  </Text>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
                    {item.lastMessage?.createdAt ? timeAgo(item.lastMessage.createdAt) : ""}
                  </Text>
                </View>
                <View style={styles.itemBottom}>
                  <Text
                    style={[
                      styles.lastMessage,
                      { color: item.unreadCount > 0 ? colors.foreground : colors.mutedForeground },
                      item.unreadCount > 0 && { fontWeight: "600" },
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.content || item.dorm?.name || "Start a conversation"}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]}>
                      <Text style={styles.unreadDotText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.dormLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.dorm?.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-square" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No conversations yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Browse dorms and message an owner to start chatting
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  unreadBadge: { borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  unreadBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  headerSubtitle: { fontSize: 15, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  listContent: { paddingBottom: 20 },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "bold" },
  itemContent: { flex: 1 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  participantName: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  timeText: { fontSize: 12 },
  itemBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  lastMessage: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadDot: { borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadDotText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  dormLabel: { fontSize: 12 },
  empty: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "bold" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
