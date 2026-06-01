import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const TICKET_TYPE_COLORS: Record<string, string> = {
  "Appeal Rejection": "#ef4444",
  "Appeal Suspension": "#dc2626",
  "Report a Technical Bug": "#f97316",
  "General Question": "#0ea5e9",
  "Payment/Listing Help": "#10b981",
  "Other": "#8b5cf6",
};

const TICKET_TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  "Appeal Rejection": "shield-off",
  "Appeal Suspension": "user-x",
  "Report a Technical Bug": "tool",
  "General Question": "help-circle",
  "Payment/Listing Help": "home",
  "Other": "more-horizontal",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminSupportTicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "resolved">("pending");
  const [search, setSearch] = useState("");

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/admin/support-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTickets(); }, [token]));

  const handleResolve = async (ticketId: number, newStatus: "pending" | "resolved") => {
    if (!token) return;
    try {
      await fetch(`${BASE_URL}/api/admin/support-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch {
      // ignore
    }
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = t.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || (t.user?.fullName ?? t.guestName ?? "").toLowerCase().includes(q)
      || t.subject.toLowerCase().includes(q)
      || t.ticketType.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = tickets.filter((t) => t.status === "pending").length;

  if (!user || user.role !== "admin") return null;

  const renderTicket = ({ item }: { item: any }) => {
    const typeColor = TICKET_TYPE_COLORS[item.ticketType] ?? "#8b5cf6";
    const typeIcon = TICKET_TYPE_ICONS[item.ticketType] ?? "help-circle";
    const isPending = item.status === "pending";
    const displayName = item.user?.fullName ?? item.guestName ?? "Anonymous";
    const isGuest = !item.user;

    return (
      <TouchableOpacity
        style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: isPending ? typeColor + "30" : colors.border, borderRadius: colors.radius }]}
        onPress={() => item.conversationId ? router.push(`/admin-conversation/${item.conversationId}`) : null}
        activeOpacity={item.conversationId ? 0.75 : 1}
      >
        <View style={styles.ticketTop}>
          <View style={[styles.typeTag, { backgroundColor: typeColor + "15" }]}>
            <Feather name={typeIcon} size={12} color={typeColor} />
            <Text style={[styles.typeTagText, { color: typeColor }]}>{item.ticketType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? "#f97316" + "18" : "#10b981" + "18" }]}>
            <View style={[styles.statusDot, { backgroundColor: isPending ? "#f97316" : "#10b981" }]} />
            <Text style={[styles.statusText, { color: isPending ? "#f97316" : "#10b981" }]}>
              {isPending ? "Pending" : "Resolved"}
            </Text>
          </View>
        </View>

        <View style={styles.ticketMiddle}>
          <View style={styles.userRow}>
            {item.user ? (
              <UserAvatar name={displayName} avatarUrl={item.user.avatarUrl} size={28} color={colors.primary} backgroundColor={colors.primary + "22"} userId={item.user.id} />
            ) : (
              <View style={[styles.guestAvatar, { backgroundColor: colors.muted }]}>
                <Feather name="user" size={14} color={colors.mutedForeground} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.foreground }]}>
                {displayName}
                {isGuest && <Text style={[styles.guestTag, { color: colors.mutedForeground }]}> (Guest)</Text>}
              </Text>
              {item.user?.email || item.guestEmail ? (
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.user?.email ?? item.guestEmail}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={[styles.subject, { color: colors.foreground }]} numberOfLines={1}>{item.subject}</Text>
          <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={2}>{item.message}</Text>
        </View>

        <View style={styles.ticketActions}>
          {item.conversationId && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderRadius: colors.radius }]}
              onPress={() => router.push(`/admin-conversation/${item.conversationId}`)}
            >
              <Feather name="message-circle" size={14} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>View Thread</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isPending ? "#10b981" + "15" : "#f97316" + "15", borderRadius: colors.radius }]}
            onPress={() => handleResolve(item.id, isPending ? "resolved" : "pending")}
          >
            <Feather name={isPending ? "check-circle" : "refresh-cw"} size={14} color={isPending ? "#10b981" : "#f97316"} />
            <Text style={[styles.actionBtnText, { color: isPending ? "#10b981" : "#f97316" }]}>
              {isPending ? "Mark Resolved" : "Reopen"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Support & Appeals</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
            </View>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search tickets…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === "pending" && { backgroundColor: "#f9731618" }]}
            onPress={() => setFilter("pending")}
          >
            <Feather name="clock" size={13} color={filter === "pending" ? "#f97316" : colors.mutedForeground} />
            <Text style={[styles.filterTabText, { color: filter === "pending" ? "#f97316" : colors.mutedForeground }]}>
              Active Queue{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === "resolved" && { backgroundColor: "#10b98118" }]}
            onPress={() => setFilter("resolved")}
          >
            <Feather name="archive" size={13} color={filter === "resolved" ? "#10b981" : colors.mutedForeground} />
            <Text style={[styles.filterTabText, { color: filter === "resolved" ? "#10b981" : colors.mutedForeground }]}>
              Resolved History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicket}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name={filter === "resolved" ? "archive" : "inbox"} size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {filter === "pending" ? "No active tickets." : "No resolved tickets yet."}
              </Text>
              <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>
                {filter === "pending"
                  ? "New support requests from users will appear here."
                  : "Resolved tickets are archived here as read-only records."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  pendingBadge: { backgroundColor: "#f97316", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  pendingBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  filterBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  filterTabs: { flexDirection: "row", gap: 4 },
  filterTab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterTabText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 14, gap: 12 },
  listEmpty: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubText: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  ticketCard: { borderWidth: 1.5, padding: 14, gap: 10 },
  ticketTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeTag: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  typeTagText: { fontSize: 12, fontWeight: "600" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  ticketMiddle: { gap: 6 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "600" },
  guestTag: { fontSize: 12, fontWeight: "400" },
  userEmail: { fontSize: 12 },
  timeText: { fontSize: 12 },
  subject: { fontSize: 15, fontWeight: "700" },
  preview: { fontSize: 13, lineHeight: 18 },
  ticketActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
});
