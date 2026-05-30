import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
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

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function MessagesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useGetConversations({
    query: { queryKey: getGetConversationsQueryKey() },
  });

  const conversations = (data as any)?.conversations || [];
  const totalUnread = conversations.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c: any) =>
        c.otherParticipant?.fullName?.toLowerCase().includes(q) ||
        c.dorm?.name?.toLowerCase().includes(q) ||
        c.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const handleOpen = (item: any) => {
    if (item.type === "admin") {
      router.push(`/admin-conversation/${item.id}`);
    } else {
      router.push(`/conversation/${item.id}`);
    }
  };

  const handleLongPress = (item: any) => {
    const endpoint = item.type === "admin"
      ? `/api/admin-conversations/${item.id}`
      : `/api/conversations/${item.id}`;

    Alert.alert(
      "Delete Conversation",
      "This will remove the conversation from your view. The other party won't be affected until they delete it too.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(`${item.type}-${item.id}`);
              await fetch(`${BASE_URL}${endpoint}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
            } catch {
              Alert.alert("Error", "Could not delete conversation. Please try again.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const isAdmin = user?.role === "admin";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 40, backgroundColor: colors.background, borderBottomColor: colors.border },
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
          {isAdmin ? "Conversations with users" : "Chat with dorm owners and admin"}
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search conversations…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
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
          data={filtered}
          keyExtractor={(item: any) => `${item.type}-${item.id}`}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={({ item }: { item: any }) => {
            const isAdminConv = item.type === "admin";
            const avatarBg = isAdminConv ? "#ef444422" : colors.primary + "22";
            const avatarColor = isAdminConv ? "#ef4444" : colors.primary;

            const isDeleting = deletingId === `${item.type}-${item.id}`;
            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  { backgroundColor: colors.card, borderBottomColor: colors.border },
                  item.unreadCount > 0 && { backgroundColor: colors.primary + "08" },
                  isDeleting && { opacity: 0.5 },
                ]}
                onPress={() => handleOpen(item)}
                onLongPress={() => handleLongPress(item)}
                delayLongPress={400}
                activeOpacity={0.7}
              >
                <View style={[styles.avatarWrap, { backgroundColor: avatarBg }]}>
                  {isAdminConv ? (
                    <Ionicons name="shield" size={22} color={avatarColor} />
                  ) : (
                    <Text style={[styles.avatarText, { color: avatarColor }]}>
                      {(item.otherParticipant?.fullName || "U")[0].toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.itemContent}>
                  <View style={styles.itemTop}>
                    <View style={styles.nameRow}>
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
                      {isAdminConv && !isAdmin && (
                        <View style={[styles.adminBadge, { backgroundColor: "#ef444415" }]}>
                          <Ionicons name="shield" size={10} color="#ef4444" />
                          <Text style={styles.adminBadgeText}>Admin</Text>
                        </View>
                      )}
                    </View>
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
                      {item.lastMessage?.content || (isAdminConv ? "Admin conversation" : item.dorm?.name || "Start a conversation")}
                    </Text>
                    {item.unreadCount > 0 && (
                      <View style={[styles.unreadDot, { backgroundColor: isAdminConv ? "#ef4444" : colors.primary }]}>
                        <Text style={styles.unreadDotText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                  {!isAdminConv && item.dorm?.name && (
                    <Text style={[styles.dormLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.dorm.name}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-square" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() ? `No results for "${search}"` : "No conversations yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {search.trim()
                  ? "Try a different name or keyword"
                  : isAdmin
                  ? "Go to Users to start a conversation with a student or owner."
                  : "Browse dorms and message an owner to start chatting."}
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
  headerSubtitle: { fontSize: 15, marginTop: 4, marginBottom: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  listContent: { paddingBottom: 20 },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 14 },
  avatarWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "bold" },
  itemContent: { flex: 1 },
  itemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 },
  participantName: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  adminBadgeText: { color: "#ef4444", fontSize: 10, fontWeight: "700" },
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
