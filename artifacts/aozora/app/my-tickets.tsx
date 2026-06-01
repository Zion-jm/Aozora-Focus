import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Ticket = {
  id: number;
  conversationId: number | null;
  ticketType: string;
  subject: string;
  message: string;
  status: "pending" | "resolved";
  createdAt: string;
  updatedAt: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#f97316", text: "#fff", label: "Open" },
  resolved: { bg: "#10b981", text: "#fff", label: "Resolved" },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyTicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "resolved">("active");

  const fetchTickets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/support-tickets/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchTickets();
    }, [fetchTickets])
  );

  const active = tickets.filter((t) => t.status === "pending");
  const resolved = tickets.filter((t) => t.status === "resolved");
  const shown = tab === "active" ? active : resolved;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Support Tickets</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["active", "resolved"] as const).map((t) => {
          const count = t === "active" ? active.length : resolved.length;
          const isActive = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                {t === "active" ? "Active" : "Resolved"}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : colors.muted }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? "#fff" : colors.mutedForeground }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : shown.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="inbox" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {tab === "active" ? "No open tickets" : "No resolved tickets"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {tab === "active"
              ? "You don't have any active support requests."
              : "Resolved tickets will appear here."}
          </Text>
          {tab === "active" && (
            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={() => router.push("/help-center")}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.newBtnText}>Submit a Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTickets(); }} tintColor={colors.primary} />}
        >
          {shown.map((ticket) => {
            const sc = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.pending;
            return (
              <TouchableOpacity
                key={ticket.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (ticket.conversationId) {
                    router.push(`/admin-conversation/${ticket.conversationId}`);
                  }
                }}
                activeOpacity={ticket.conversationId ? 0.75 : 1}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                  </View>
                  <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{formatDate(ticket.createdAt)}</Text>
                </View>

                <Text style={[styles.cardSubject, { color: colors.foreground }]} numberOfLines={2}>
                  {ticket.subject}
                </Text>

                <View style={styles.cardMeta}>
                  <View style={[styles.typePill, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{ticket.ticketType}</Text>
                  </View>
                  {ticket.conversationId && (
                    <View style={styles.chatHint}>
                      <Feather name="message-circle" size={13} color={colors.primary} />
                      <Text style={[styles.chatHintText, { color: colors.primary }]}>View thread</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  tabText: { fontSize: 15, fontWeight: "600" },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  tabBadgeText: { fontSize: 11, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  newBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  cardDate: { fontSize: 12 },
  cardSubject: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  typePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  typeText: { fontSize: 12, fontWeight: "500" },
  chatHint: { flexDirection: "row", alignItems: "center", gap: 4 },
  chatHintText: { fontSize: 13, fontWeight: "600" },
});
