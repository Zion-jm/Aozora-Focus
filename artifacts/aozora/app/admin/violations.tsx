import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CATEGORY_LABELS: Record<string, string> = {
  harassment:            "Harassment",
  spam:                  "Spam",
  fake_listing:          "Fake Listing",
  fake_identity:         "Fake Identity",
  hate_speech:           "Hate Speech",
  inappropriate_content: "Inappropriate Content",
  no_show:               "No-Show",
  other:                 "Other",
};

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  harassment:            "alert-octagon",
  spam:                  "mail",
  fake_listing:          "home",
  fake_identity:         "user-x",
  hate_speech:           "message-square",
  inappropriate_content: "eye-off",
  no_show:               "calendar",
  other:                 "more-horizontal",
};

const SEV_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: "Low",      color: "#10b981", bg: "#10b98115" },
  2: { label: "Medium",   color: "#f59e0b", bg: "#f59e0b15" },
  3: { label: "High",     color: "#f97316", bg: "#f9731615" },
  4: { label: "Critical", color: "#ef4444", bg: "#ef444415" },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  clean:            { label: "Clean",      color: "#10b981" },
  warning:          { label: "Warning",    color: "#f59e0b" },
  short_suspension: { label: "7-Day Susp", color: "#f97316" },
  long_suspension:  { label: "30-Day Susp",color: "#ef4444" },
  ban:              { label: "Ban",         color: "#7c3aed" },
};

const SEV_FILTERS = ["All", "Low", "Medium", "High", "Critical"];
const SEV_FILTER_MAP: Record<string, number | null> = {
  All: null, Low: 1, Medium: 2, High: 3, Critical: 4,
};

export default function ViolationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("All");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["adminAllViolations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/violations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15_000,
  });

  const violations: any[] = data?.violations ?? [];
  const stats = data?.stats ?? {};

  const filtered = violations.filter((v) => {
    const sevMatch = SEV_FILTER_MAP[sevFilter] === null || v.severity === SEV_FILTER_MAP[sevFilter];
    const q = search.toLowerCase();
    const textMatch = !q ||
      v.user_name?.toLowerCase().includes(q) ||
      CATEGORY_LABELS[v.category]?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q);
    return sevMatch && textMatch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 14, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Violations</Text>
        <TouchableOpacity onPress={() => refetch()} disabled={isRefetching}>
          <Feather name="refresh-cw" size={18} color={isRefetching ? colors.mutedForeground : colors.foreground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 80 }]}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              {[
                { label: "Total", value: stats.total ?? 0, color: colors.primary },
                { label: "Critical", value: stats.bySeverity?.[4] ?? 0, color: "#ef4444" },
                { label: "High", value: stats.bySeverity?.[3] ?? 0, color: "#f97316" },
                { label: "Medium", value: stats.bySeverity?.[2] ?? 0, color: "#f59e0b" },
                { label: "Low", value: stats.bySeverity?.[1] ?? 0, color: "#10b981" },
              ].map((s) => (
                <View key={s.label} style={[styles.statChip, { backgroundColor: s.color + "12", borderRadius: 10 }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search user, category..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Severity filter */}
            <View style={styles.filterRow}>
              {SEV_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSevFilter(f)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: sevFilter === f ? colors.primary : colors.secondary,
                      borderColor: sevFilter === f ? colors.primary : colors.border,
                      borderRadius: 20,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: sevFilter === f ? "#fff" : colors.mutedForeground },
                    ]}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="check-circle" size={36} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, marginTop: 8 }]}>No violations found</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const sev = SEV_CONFIG[item.severity] ?? SEV_CONFIG[1]!;
          const lev = LEVEL_CONFIG[item.level] ?? LEVEL_CONFIG["clean"]!;
          return (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/admin/user-violations",
                  params: { userId: String(item.user_id), userName: item.user_name ?? "User" },
                })
              }
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              activeOpacity={0.75}
            >
              <View style={styles.cardTop}>
                <View style={[styles.catIconWrap, { backgroundColor: sev.bg, borderRadius: 10 }]}>
                  <Feather name={CATEGORY_ICONS[item.category] ?? "alert-octagon"} size={16} color={sev.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{item.user_name ?? "Unknown"}</Text>
                  <Text style={[styles.category, { color: colors.mutedForeground }]}>
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.badge, { backgroundColor: sev.bg, borderRadius: 5 }]}>
                    <Text style={[styles.badgeText, { color: sev.color }]}>{sev.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: lev.color + "15", borderRadius: 5 }]}>
                    <Text style={[styles.badgeText, { color: lev.color }]}>{lev.label}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.cardFoot}>
                <Feather name="clock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  {new Date(item.created_at).toLocaleDateString("en-PH", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </Text>
                <Text style={[styles.adminText, { color: colors.mutedForeground }]}>· by {item.admin_name ?? "Admin"}</Text>
                <View style={{ flex: 1 }} />
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  body: { padding: 12, gap: 8 },

  statsRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  statChip: { flex: 1, alignItems: "center", padding: 10 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "500", marginTop: 1 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: { flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: "600" },

  emptyCard: {
    padding: 48,
    alignItems: "center",
    borderWidth: 1,
    margin: 4,
  },

  card: { borderWidth: 1, padding: 12, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  catIconWrap: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  userName: { fontSize: 14, fontWeight: "700" },
  category: { fontSize: 12, marginTop: 1 },
  badges: { gap: 4, alignItems: "flex-end" },
  badge: { paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  desc: { fontSize: 12, lineHeight: 18 },
  cardFoot: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11 },
  adminText: { fontSize: 11 },
});
