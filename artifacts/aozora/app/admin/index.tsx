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

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function StatCard({ label, value, icon, color, colors }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value ?? "—"}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function NavCard({ icon, label, desc, onPress, colors, badge }: any) {
  return (
    <TouchableOpacity
      style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.navIcon, { backgroundColor: colors.primary + "18" }]}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.navInfo}>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.navDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: "#ef4444" }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() },
  });
  const stats = data as any;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
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
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard label="Total Users" value={stats?.totalUsers} icon="users" color="#0ea5e9" colors={colors} />
              <StatCard label="Total Dorms" value={stats?.totalDorms} icon="home" color="#8b5cf6" colors={colors} />
              <StatCard label="Pending Dorms" value={stats?.pendingDorms} icon="clock" color="#f59e0b" colors={colors} />
              <StatCard label="Pending Verifs" value={stats?.pendingVerifications} icon="shield" color="#ef4444" colors={colors} />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Manage</Text>
            <View style={styles.navList}>
              <NavCard
                icon="home"
                label="Dorm Approvals"
                desc="Review and approve new listings"
                badge={stats?.pendingDorms > 0 ? stats.pendingDorms : null}
                onPress={() => router.push("/admin/dorms")}
                colors={colors}
              />
              <NavCard
                icon="shield"
                label="ID Verifications"
                desc="Review submitted ID documents"
                badge={stats?.pendingVerifications > 0 ? stats.pendingVerifications : null}
                onPress={() => router.push("/admin/verifications")}
                colors={colors}
              />
              <NavCard
                icon="users"
                label="User Management"
                desc="View and manage platform users"
                onPress={() => router.push("/admin/users")}
                colors={colors}
              />
              <NavCard
                icon="flag"
                label="User Reports"
                desc="Review safety and moderation reports"
                badge={stats?.pendingReports > 0 ? stats.pendingReports : null}
                onPress={() => router.push("/admin/reports")}
                colors={colors}
              />
              <NavCard
                icon="x-circle"
                label="Turned Down Listings"
                desc="Restore listings that were turned down"
                onPress={() => router.push("/admin/rejected-listings")}
                colors={colors}
              />
              <NavCard
                icon="user-x"
                label="Suspended Users"
                desc="View and unsuspend blocked accounts"
                onPress={() => router.push("/admin/suspended-users")}
                colors={colors}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerSub: { fontSize: 13 },
  body: { padding: 16, gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "bold", marginBottom: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", borderWidth: 1, padding: 16, gap: 8 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontWeight: "bold" },
  statLabel: { fontSize: 13 },
  navList: { gap: 10 },
  navCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1 },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navInfo: { flex: 1 },
  navLabel: { fontSize: 16, fontWeight: "600" },
  navDesc: { fontSize: 13, marginTop: 2 },
  badge: { borderRadius: 12, minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
});
