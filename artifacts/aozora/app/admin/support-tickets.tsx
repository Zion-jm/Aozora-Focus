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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const TICKET_TYPE_COLORS: Record<string, string> = {
  "Appeal Rejection": "#ef4444",
  "Appeal Suspension": "#dc2626",
  "Appeal Takedown": "#f97316",
  "Report a Technical Bug": "#f97316",
  "General Question": "#0ea5e9",
  "Payment/Listing Help": "#10b981",
  "Other": "#8b5cf6",
};

import { timeAgo } from "../../utils/time";

const TICKET_TYPE_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  "Appeal Rejection": "shield-off",
  "Appeal Suspension": "user-x",
  "Appeal Takedown": "alert-triangle",
  "Report a Technical Bug": "tool",
  "General Question": "help-circle",
  "Payment/Listing Help": "home",
  "Other": "more-horizontal",
};

type ResponseOption = {
  label: string;
  responseType: string;
  color: string;
  icon: React.ComponentProps<typeof Feather>["name"];
};

function getResponseOptions(ticketType: string): [ResponseOption, ResponseOption] {
  switch (ticketType) {
    case "Appeal Suspension":
      return [
        { label: "Suspension Lifted", responseType: "suspension_lifted", color: "#10b981", icon: "unlock" },
        { label: "Suspension Persists", responseType: "suspension_persists", color: "#ef4444", icon: "lock" },
      ];
    case "Appeal Rejection":
      return [
        { label: "Decision Overturned", responseType: "decision_overturned", color: "#10b981", icon: "check-circle" },
        { label: "Rejection Stands", responseType: "rejection_stands", color: "#f97316", icon: "x-circle" },
      ];
    case "Appeal Takedown":
      return [
        { label: "Takedown Reversed", responseType: "takedown_reversed", color: "#10b981", icon: "refresh-cw" },
        { label: "Takedown Upheld", responseType: "takedown_upheld", color: "#f97316", icon: "slash" },
      ];
    default:
      return [
        { label: "Request Resolved", responseType: "request_resolved", color: "#10b981", icon: "check-circle" },
        { label: "Request Denied", responseType: "request_denied", color: "#f97316", icon: "x-circle" },
      ];
  }
}

const RESPONSE_LABELS: Record<string, string> = {
  suspension_lifted: "Suspension Lifted",
  suspension_persists: "Suspension Persists",
  decision_overturned: "Decision Overturned",
  rejection_stands: "Rejection Stands",
  takedown_reversed: "Takedown Reversed",
  takedown_upheld: "Takedown Upheld",
  request_resolved: "Request Resolved",
  request_denied: "Request Denied",
};

export default function AdminSupportTicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"pending" | "resolved">("pending");
  const [search, setSearch] = useState("");
  const [sendingEmail, setSendingEmail] = useState<Record<number, boolean>>({});

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

  const handleSendEmailResponse = async (item: any, responseType: string, label: string) => {
    if (!token) return;

    Alert.alert(
      `Send Email: ${label}`,
      `This will send an email to ${item.guestEmail ?? item.user?.email ?? "the user"} and mark the ticket as resolved.\n\nProceed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send & Resolve",
          style: "default",
          onPress: async () => {
            setSendingEmail((prev) => ({ ...prev, [item.id]: true }));
            try {
              const res = await fetch(`${BASE_URL}/api/admin/support-tickets/${item.id}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ responseType }),
              });
              if (res.ok) {
                setTickets((prev) =>
                  prev.map((t) =>
                    t.id === item.id ? { ...t, status: "resolved", adminResponse: responseType } : t
                  )
                );
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert("Failed", (err as any).message ?? "Could not send email. Please try again.");
              }
            } catch {
              Alert.alert("Error", "Network error. Please try again.");
            } finally {
              setSendingEmail((prev) => ({ ...prev, [item.id]: false }));
            }
          },
        },
      ]
    );
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
    const isSuspendedUser = !!item.user?.isSuspended;
    const needsEmailResponse = (isGuest || isSuspendedUser) && isPending;
    const isSending = !!sendingEmail[item.id];
    const [positiveOption, negativeOption] = getResponseOptions(item.ticketType);

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
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.foreground }]}>
                  {displayName}
                </Text>
                {isGuest && (
                  <View style={[styles.pill, { backgroundColor: "#6b7280" + "18" }]}>
                    <Text style={[styles.pillText, { color: "#6b7280" }]}>Guest</Text>
                  </View>
                )}
                {isSuspendedUser && (
                  <View style={[styles.pill, { backgroundColor: "#ef4444" + "15" }]}>
                    <Feather name="lock" size={9} color="#ef4444" />
                    <Text style={[styles.pillText, { color: "#ef4444" }]}>Suspended</Text>
                  </View>
                )}
              </View>
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

        {needsEmailResponse && (
          <View style={[styles.emailSection, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <View style={styles.emailSectionHeader}>
              <Feather name="mail" size={13} color={colors.mutedForeground} />
              <Text style={[styles.emailSectionLabel, { color: colors.mutedForeground }]}>
                Send email response
              </Text>
            </View>
            <View style={styles.emailBtnRow}>
              {isSending ? (
                <View style={styles.sendingWrap}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.sendingText, { color: colors.mutedForeground }]}>Sending email…</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.emailBtn, { backgroundColor: positiveOption.color + "18", borderColor: positiveOption.color + "40" }]}
                    onPress={() => handleSendEmailResponse(item, positiveOption.responseType, positiveOption.label)}
                    activeOpacity={0.8}
                  >
                    <Feather name={positiveOption.icon} size={13} color={positiveOption.color} />
                    <Text style={[styles.emailBtnText, { color: positiveOption.color }]}>{positiveOption.label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emailBtn, { backgroundColor: negativeOption.color + "18", borderColor: negativeOption.color + "40" }]}
                    onPress={() => handleSendEmailResponse(item, negativeOption.responseType, negativeOption.label)}
                    activeOpacity={0.8}
                  >
                    <Feather name={negativeOption.icon} size={13} color={negativeOption.color} />
                    <Text style={[styles.emailBtnText, { color: negativeOption.color }]}>{negativeOption.label}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {!isPending && item.adminResponse && (
          <View style={[styles.resolvedBadgeRow, { backgroundColor: "#10b981" + "10" }]}>
            <Feather name="send" size={12} color="#10b981" />
            <Text style={[styles.resolvedBadgeText, { color: "#10b981" }]}>
              Email sent: {RESPONSE_LABELS[item.adminResponse] ?? item.adminResponse}
            </Text>
          </View>
        )}

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
      <PageHeader
        title="Support & Appeals"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : "Manage support requests"}
      />

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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  userName: { fontSize: 14, fontWeight: "600" },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  pillText: { fontSize: 10, fontWeight: "700" },
  userEmail: { fontSize: 12 },
  timeText: { fontSize: 12 },
  subject: { fontSize: 15, fontWeight: "700" },
  preview: { fontSize: 13, lineHeight: 18 },
  emailSection: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8 },
  emailSectionHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  emailSectionLabel: { fontSize: 12, fontWeight: "600" },
  emailBtnRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  emailBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center" },
  emailBtnText: { fontSize: 12, fontWeight: "700" },
  sendingWrap: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center", paddingVertical: 6 },
  sendingText: { fontSize: 13 },
  resolvedBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  resolvedBadgeText: { fontSize: 12, fontWeight: "600" },
  ticketActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
});
