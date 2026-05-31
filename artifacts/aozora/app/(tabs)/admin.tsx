import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { getAdminGetStatsQueryKey, useAdminGetStats } from "@workspace/api-client-react";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function SegmentBar({
  segments,
  height = 10,
}: {
  segments: { value: number; color: string; label?: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  return (
    <View style={{ flexDirection: "row", height, borderRadius: height / 2, overflow: "hidden", backgroundColor: "#e2e8f022" }}>
      {segments.map((seg, i) => (
        <View key={i} style={{ flex: Math.max(seg.value, 0.001) / total, backgroundColor: seg.color }} />
      ))}
    </View>
  );
}

function TrendBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 44, gap: 4 }}>
      {values.map((v, i) => {
        const pct = v / max;
        const isLast = i === values.length - 1;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(6, pct * 44),
              borderRadius: 4,
              backgroundColor: color,
              opacity: isLast ? 1 : 0.3 + (i / values.length) * 0.55,
            }}
          />
        );
      })}
    </View>
  );
}

function PriorityCard({
  icon,
  count,
  label,
  color,
  onPress,
  colors,
}: {
  icon: FeatherName;
  count: number;
  label: string;
  color: string;
  onPress: () => void;
  colors: any;
}) {
  const hasAlert = count > 0;
  return (
    <TouchableOpacity
      style={[
        styles.priorityCard,
        {
          backgroundColor: colors.card,
          borderColor: hasAlert ? color + "40" : colors.border,
          borderRadius: colors.radius,
          borderWidth: hasAlert ? 1.5 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.priorityIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.priorityCount, { color: hasAlert ? color : colors.foreground }]}>
        {count}
      </Text>
      <Text style={[styles.priorityLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {hasAlert && (
        <View style={[styles.alertDot, { backgroundColor: color }]} />
      )}
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  label,
  desc,
  onPress,
  badge,
  colors,
}: {
  icon: FeatherName;
  label: string;
  desc: string;
  onPress: () => void;
  badge?: number | null;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.quickActionInfo}>
        <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.quickActionDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{desc}</Text>
      </View>
      {badge ? (
        <View style={styles.quickBadge}>
          <Text style={styles.quickBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function AdminTabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isDark = useColorScheme() === "dark";

  const { data, isLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey() },
  });
  const s = data as any;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const userTotal = (s?.totalStudents ?? 0) + (s?.totalOwners ?? 0);
  const dormTotal = (s?.approvedDorms ?? 0) + (s?.pendingDorms ?? 0) + (s?.takenDownDorms ?? 0);

  const trendBars = useMemo(() => {
    const base = s?.approvedDorms || 8;
    return [0.32, 0.44, 0.53, 0.65, 0.74, 0.88, 1.0].map((p) =>
      Math.max(1, Math.round(base * p))
    );
  }, [s?.approvedDorms]);

  const headerBg = isDark ? "#0f172a" : colors.primary;
  const headerFg = "#ffffff";
  const headerMuted = "rgba(255,255,255,0.65)";

  if (!user || user.role !== "admin") return null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: headerBg, paddingTop: insets.top + 20 }]}>
          <View style={styles.heroInner}>
            <View style={[styles.heroShield, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="shield" size={22} color={headerFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroGreeting, { color: headerMuted }]}>{greeting},</Text>
              <Text style={[styles.heroName, { color: headerFg }]} numberOfLines={1}>
                {user.fullName?.split(" ")[0] ?? "Admin"}
              </Text>
              <Text style={[styles.heroDate, { color: headerMuted }]}>{today}</Text>
            </View>
          </View>

          {isLoading ? null : (
            <View style={styles.heroPills}>
              <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="users" size={13} color={headerFg} />
                <Text style={[styles.heroPillText, { color: headerFg }]}>
                  {s?.totalUsers ?? 0} users
                </Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="home" size={13} color={headerFg} />
                <Text style={[styles.heroPillText, { color: headerFg }]}>
                  {s?.approvedDorms ?? 0} active listings
                </Text>
              </View>
              <View style={[styles.heroPill, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Feather name="calendar" size={13} color={headerFg} />
                <Text style={[styles.heroPillText, { color: headerFg }]}>
                  {s?.totalAppointments ?? 0} visits
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NEEDS ATTENTION</Text>
              <View style={styles.priorityGrid}>
                <PriorityCard
                  icon="clock"
                  count={s?.pendingDorms ?? 0}
                  label={"Pending\nListings"}
                  color="#f97316"
                  onPress={() => router.push("/admin/dorms")}
                  colors={colors}
                />
                <PriorityCard
                  icon="shield"
                  count={s?.pendingVerifications ?? 0}
                  label={"Pending\nVerifs"}
                  color="#ef4444"
                  onPress={() => router.push("/admin/verifications")}
                  colors={colors}
                />
                <PriorityCard
                  icon="flag"
                  count={s?.pendingReports ?? 0}
                  label={"Open\nReports"}
                  color="#ef4444"
                  onPress={() => router.push("/admin/reports")}
                  colors={colors}
                />
                <PriorityCard
                  icon="user-x"
                  count={s?.suspendedUsers ?? 0}
                  label={"Suspended\nUsers"}
                  color="#8b5cf6"
                  onPress={() => router.push("/admin/suspended-users")}
                  colors={colors}
                />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PLATFORM OVERVIEW</Text>
              <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>

                <View style={styles.overviewRow}>
                  <View style={styles.overviewRowHeader}>
                    <View style={[styles.overviewDot, { backgroundColor: "#0ea5e9" }]} />
                    <Text style={[styles.overviewTitle, { color: colors.foreground }]}>Users</Text>
                    <Text style={[styles.overviewTotal, { color: colors.mutedForeground }]}>{s?.totalUsers ?? 0} total</Text>
                  </View>
                  <SegmentBar
                    height={10}
                    segments={[
                      { value: s?.totalStudents ?? 0, color: "#0ea5e9" },
                      { value: s?.totalOwners ?? 0, color: "#8b5cf6" },
                    ]}
                  />
                  <View style={styles.overviewLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#0ea5e9" }]} />
                      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Students ({s?.totalStudents ?? 0})</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#8b5cf6" }]} />
                      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Owners ({s?.totalOwners ?? 0})</Text>
                    </View>
                    {(s?.suspendedUsers ?? 0) > 0 && (
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                        <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Suspended ({s.suspendedUsers})</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

                <View style={styles.overviewRow}>
                  <View style={styles.overviewRowHeader}>
                    <View style={[styles.overviewDot, { backgroundColor: "#10b981" }]} />
                    <Text style={[styles.overviewTitle, { color: colors.foreground }]}>Listings</Text>
                    <Text style={[styles.overviewTotal, { color: colors.mutedForeground }]}>{s?.totalDorms ?? 0} total</Text>
                  </View>
                  <SegmentBar
                    height={10}
                    segments={[
                      { value: s?.approvedDorms ?? 0, color: "#10b981" },
                      { value: s?.pendingDorms ?? 0, color: "#f97316" },
                      { value: s?.takenDownDorms ?? 0, color: "#ef4444" },
                    ]}
                  />
                  <View style={styles.overviewLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
                      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Active ({s?.approvedDorms ?? 0})</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: "#f97316" }]} />
                      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Pending ({s?.pendingDorms ?? 0})</Text>
                    </View>
                    {(s?.takenDownDorms ?? 0) > 0 && (
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                        <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Turned down ({s.takenDownDorms})</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.overviewDivider, { backgroundColor: colors.border }]} />

                <View style={styles.overviewRow}>
                  <View style={styles.overviewRowHeader}>
                    <View style={[styles.overviewDot, { backgroundColor: "#f59e0b" }]} />
                    <Text style={[styles.overviewTitle, { color: colors.foreground }]}>Active Listings Trend</Text>
                    <Text style={[styles.overviewTotal, { color: colors.mutedForeground }]}>7-day</Text>
                  </View>
                  <TrendBars values={trendBars} color={colors.primary} />
                  <Text style={[styles.trendNote, { color: colors.mutedForeground }]}>
                    Simulated growth · {s?.approvedDorms ?? 0} active today
                  </Text>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUICK ACCESS</Text>
              <View style={styles.quickList}>
                <QuickAction
                  icon="home"
                  label="Dorm Approvals"
                  desc="Review and approve new listings"
                  badge={s?.pendingDorms > 0 ? s.pendingDorms : null}
                  onPress={() => router.push("/admin/dorms")}
                  colors={colors}
                />
                <QuickAction
                  icon="shield"
                  label="ID Verifications"
                  desc="Review submitted ID documents"
                  badge={s?.pendingVerifications > 0 ? s.pendingVerifications : null}
                  onPress={() => router.push("/admin/verifications")}
                  colors={colors}
                />
                <QuickAction
                  icon="users"
                  label="User Management"
                  desc="View and manage platform users"
                  badge={null}
                  onPress={() => router.push("/admin/users")}
                  colors={colors}
                />
                <QuickAction
                  icon="flag"
                  label="User Reports"
                  desc="Review safety and moderation reports"
                  badge={s?.pendingReports > 0 ? s.pendingReports : null}
                  onPress={() => router.push("/admin/reports")}
                  colors={colors}
                />
                <QuickAction
                  icon="x-circle"
                  label="Turned Down Listings"
                  desc="Restore listings taken down via reports"
                  badge={s?.takenDownDorms > 0 ? s.takenDownDorms : null}
                  onPress={() => router.push("/admin/rejected-listings")}
                  colors={colors}
                />
                <QuickAction
                  icon="user-x"
                  label="Suspended Users"
                  desc="View and unsuspend blocked accounts"
                  badge={s?.suspendedUsers > 0 ? s.suspendedUsers : null}
                  onPress={() => router.push("/admin/suspended-users")}
                  colors={colors}
                />
                <QuickAction
                  icon="life-buoy"
                  label="Support & Appeals"
                  desc="Review help tickets and user appeals"
                  badge={s?.pendingSupportTickets > 0 ? s.pendingSupportTickets : null}
                  onPress={() => router.push("/admin/support-tickets")}
                  colors={colors}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 18,
  },
  heroInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroShield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heroGreeting: { fontSize: 13, fontWeight: "500", marginBottom: 1 },
  heroName: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  heroDate: { fontSize: 13, marginTop: 2 },
  heroPills: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPillText: { fontSize: 12, fontWeight: "600" },

  body: { padding: 16, gap: 12 },
  loadingBox: { paddingTop: 60, alignItems: "center" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
  },

  priorityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  priorityCard: {
    width: "47%",
    borderWidth: 1,
    padding: 14,
    gap: 6,
    position: "relative",
  },
  priorityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityCount: { fontSize: 30, fontWeight: "800", lineHeight: 36 },
  priorityLabel: { fontSize: 12, lineHeight: 17 },
  alertDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  overviewCard: { borderWidth: 1, overflow: "hidden" },
  overviewRow: { padding: 16, gap: 10 },
  overviewRowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  overviewDot: { width: 8, height: 8, borderRadius: 4 },
  overviewTitle: { fontSize: 14, fontWeight: "600", flex: 1 },
  overviewTotal: { fontSize: 13 },
  overviewLegend: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  overviewDivider: { height: 1, marginHorizontal: 0 },
  trendNote: { fontSize: 11, marginTop: -2 },

  quickList: { gap: 8 },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionInfo: { flex: 1 },
  quickActionLabel: { fontSize: 15, fontWeight: "600" },
  quickActionDesc: { fontSize: 12, marginTop: 1 },
  quickBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  quickBadgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
