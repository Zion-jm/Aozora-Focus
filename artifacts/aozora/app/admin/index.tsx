import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { getAdminGetStatsQueryKey, useAdminGetStats } from "@workspace/api-client-react";

function StatCard({ label, value, icon, color, colors }: any) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value ?? "—"}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}


export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() },
  });
  const s = data as any;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Admin Panel</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Aozora Dashboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>OVERVIEW</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total Users" value={s?.totalUsers} icon="users" color="#0ea5e9" colors={colors} />
              <StatCard label="Active Listings" value={s?.approvedDorms} icon="home" color="#10b981" colors={colors} />
              <StatCard label="Pending Listings" value={s?.pendingDorms} icon="clock" color="#f97316" colors={colors} />
              <StatCard label="Pending Verifs" value={s?.pendingVerifications} icon="shield" color="#ef4444" colors={colors} />
              <StatCard label="Suspended Users" value={s?.suspendedUsers} icon="user-x" color="#8b5cf6" colors={colors} />
              <StatCard label="Turned Down" value={s?.takenDownDorms} icon="x-circle" color="#ef4444" colors={colors} />
            </View>

          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  body: { padding: 16, gap: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "30.5%",
    borderWidth: 1,
    padding: 12,
    gap: 6,
    minWidth: 100,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 24, fontWeight: "bold" },
  statLabel: { fontSize: 11 },
});
