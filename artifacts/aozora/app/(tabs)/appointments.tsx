import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getGetAppointmentsQueryKey, useGetAppointments } from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

type Tab = "active" | "history";

export default function AppointmentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("active");

  const { data, isLoading, isError, refetch, isRefetching } = useGetAppointments({
    query: { queryKey: getGetAppointmentsQueryKey() },
  });

  const appointments = data?.appointments || [];
  const pendingCount = appointments.filter((a: any) => a.status === "pending").length;

  const tabData = useMemo(() => {
    if (tab === "active") {
      return appointments.filter((a: any) => a.status === "pending");
    }
    return appointments.filter((a: any) => a.status === "approved" || a.status === "rejected");
  }, [appointments, tab]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tabData;
    const q = search.toLowerCase();
    return tabData.filter(
      (a: any) =>
        a.dorm?.name?.toLowerCase().includes(q) ||
        STATUS_LABELS[a.status]?.toLowerCase().includes(q) ||
        a.preferredDate?.toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q)
    );
  }, [tabData, search]);

  const emptyTitle = search.trim()
    ? `No results for "${search}"`
    : tab === "active"
    ? "No active visits"
    : "No past visits yet";

  const emptySubtitle = search.trim()
    ? "Try searching by dorm name, status, or date"
    : tab === "active"
    ? user?.role === "owner"
      ? "Pending visit requests will appear here"
      : "Book a visit to a dorm to get started"
    : user?.role === "owner"
    ? "Approved or rejected visits will appear here"
    : "Your completed and past visits will appear here";

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Visits</Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
          {user?.role === "owner" ? "Review visit requests from students" : "Your scheduled dorm visits"}
        </Text>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { borderRadius: colors.radius - 2 },
              tab === "active" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
            ]}
            onPress={() => { setTab("active"); setSearch(""); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "active" ? colors.foreground : colors.mutedForeground }]}>
              Active
            </Text>
            {tab === "active" && pendingCount > 0 && (
              <View style={[styles.tabCount, { backgroundColor: colors.primary }]}>
                <Text style={styles.tabCountText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              { borderRadius: colors.radius - 2 },
              tab === "history" && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
            ]}
            onPress={() => { setTab("history"); setSearch(""); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: tab === "history" ? colors.foreground : colors.mutedForeground }]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by dorm, status, or date…"
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
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load appointments</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
              onPress={() => router.push(`/appointment/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={styles.dormInfo}>
                  <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.dorm?.name || "Dorm"}
                  </Text>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                      {item.preferredDate} at {item.preferredTime}
                    </Text>
                  </View>
                  {tab === "history" && item.status === "approved" && (
                    <View style={styles.reviewHint}>
                      <Feather name="edit-3" size={11} color={colors.primary} />
                      <Text style={[styles.reviewHintText, { color: colors.primary }]}>
                        {user?.role === "owner" ? "Tap to review tenant" : "Tap to review dorm"}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_COLORS[item.status] || "#64748b") + "22" },
                  ]}
                >
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || "#64748b" }]}>
                    {STATUS_LABELS[item.status] || item.status}
                  </Text>
                </View>
              </View>
              {item.message ? (
                <Text style={[styles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
                  "{item.message}"
                </Text>
              ) : null}
              <View style={styles.cardFooter}>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather
                name={tab === "history" ? "clock" : "calendar"}
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{emptyTitle}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>{emptySubtitle}</Text>
              {!search.trim() && tab === "active" && user?.role === "student" && (
                <TouchableOpacity
                  style={[styles.exploreBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={() => router.push("/(tabs)")}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Browse Dorms</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  badge: { borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  headerSubtitle: { fontSize: 15, marginTop: 4, marginBottom: 12 },
  tabs: { flexDirection: "row", padding: 3, gap: 2, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, gap: 6 },
  tabText: { fontSize: 14, fontWeight: "600" },
  tabCount: { borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabCountText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  listContent: { padding: 16, gap: 12 },
  card: { borderWidth: 1, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  dormInfo: { flex: 1, marginRight: 12, gap: 4 },
  dormName: { fontSize: 17, fontWeight: "600" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 13 },
  reviewHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  reviewHintText: { fontSize: 12, fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  message: { fontSize: 14, fontStyle: "italic", marginBottom: 8 },
  cardFooter: { alignItems: "flex-end" },
  empty: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", textAlign: "center" },
  emptySubtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  exploreBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12 },
});
