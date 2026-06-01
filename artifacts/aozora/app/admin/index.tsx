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

function NavCard({ icon, label, desc, onPress, colors, badge, color }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.navCard,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={[styles.navIcon, { backgroundColor: (color || colors.primary) + "15" }]}>
        <Feather name={icon} size={20} color={color || colors.primary} />
      </View>
      <View style={styles.navInfo}>
        <Text style={[styles.navLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.navDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
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

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>MANAGE</Text>
            <View style={styles.navList}>
              <NavCard
                icon="home"
                label="Dorm Approvals"
                desc="Review and approve new listings"
                badge={s?.pendingDorms > 0 ? s.pendingDorms : null}
                color="#f97316"
                onPress={() => router.push("/admin/dorms")}
                colors={colors}
              />
              <NavCard
                icon="shield"
                label="ID Verifications"
                desc="Review submitted ID documents"
                badge={s?.pendingVerifications > 0 ? s.pendingVerifications : null}
                color="#ef4444"
                onPress={() => router.push("/admin/verifications")}
                colors={colors}
              />
              <NavCard
                icon="users"
                label="User Management"
                desc="View and manage platform users"
                color="#0ea5e9"
                onPress={() => router.push("/admin/users")}
                colors={colors}
              />
              <NavCard
                icon="flag"
                label="User Reports"
                desc="Review safety and moderation reports"
                badge={s?.pendingReports > 0 ? s.pendingReports : null}
                color="#ef4444"
                onPress={() => router.push("/admin/reports")}
                colors={colors}
              />
              <NavCard
                icon="x-circle"
                label="Turned Down Listings"
                desc="Restore listings taken down via reports"
                badge={s?.takenDownDorms > 0 ? s.takenDownDorms : null}
                color="#f97316"
                onPress={() => router.push("/admin/rejected-listings")}
                colors={colors}
              />
              <NavCard
                icon="user-x"
                label="Suspended Users"
                desc="View and unsuspend blocked accounts"
                badge={s?.suspendedUsers > 0 ? s.suspendedUsers : null}
                color="#8b5cf6"
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
  navList: { gap: 8 },
  navCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  navIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navInfo: { flex: 1 },
  navLabel: { fontSize: 15, fontWeight: "600" },
  navDesc: { fontSize: 12, marginTop: 2 },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
