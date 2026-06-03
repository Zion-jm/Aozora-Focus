import React, { useMemo } from "react";
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
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { getAdminGetStatsQueryKey, useAdminGetStats } from "@workspace/api-client-react";
import { timeAgo as formatRelative } from "../../utils/time";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type ActivityItem = { type: string; label: string; at: string };

type RiskUser = {
  userId: number;
  name: string;
  avatarUrl: string | null;
  isSuspended: boolean;
  score: number;
  level: string;
  violationCount: number;
};

type SuspendedUserPreview = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  suspendedUntil: string | null;
  isPermanent: boolean;
  daysLeft: number | null;
};

function suspendedCountdown(user: SuspendedUserPreview): { label: string; color: string } {
  if (user.isPermanent) return { label: "Permanent ban", color: "#7c3aed" };
  if (user.daysLeft === null) return { label: "Unknown", color: "#64748b" };
  if (user.daysLeft === 0) return { label: "Expiring today", color: "#10b981" };
  if (user.daysLeft === 1) return { label: "1 day left", color: "#f97316" };
  return { label: `${user.daysLeft} days left`, color: user.daysLeft <= 3 ? "#f97316" : "#ef4444" };
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  warning:          { label: "Warning",      color: "#f59e0b", bg: "#f59e0b18" },
  short_suspension: { label: "7-Day Susp.",  color: "#f97316", bg: "#f9731618" },
  long_suspension:  { label: "30-Day Susp.", color: "#ef4444", bg: "#ef444418" },
  ban:              { label: "Ban",           color: "#7c3aed", bg: "#7c3aed18" },
};

const ACTIVITY_ICON: Record<string, any> = {
  user: "user-plus",
  dorm: "home",
  appointment: "calendar",
  report: "flag",
};
const ACTIVITY_COLOR: Record<string, string> = {
  user: "#0ea5e9",
  dorm: "#10b981",
  appointment: "#4f46e5",
  report: "#ef4444",
};
const DORM_COLORS = ["#10b981", "#f59e0b", "#ef4444"];
const DORM_LABELS = ["Approved", "Pending", "Taken Down"];
const USER_COLORS = ["#4f46e5", "#0ea5e9", "#ef4444"];
const USER_LABELS = ["Boarders", "Owners", "Suspended"];

function DonutChart({ data, colors: themeColors }: { data: { value: number; color: string; label: string }[]; colors: any }) {
  const size = 130;
  const strokeWidth = 20;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);

  const segments = useMemo(() => {
    if (total === 0) return [];
    let offset = 0;
    return data.map((d) => {
      const pct = d.value / total;
      const dash = pct * circumference;
      const seg = { ...d, dash, gap: circumference - dash, offset };
      offset += dash;
      return seg;
    });
  }, [data, total, circumference]);

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${cx},${cy}`}>
        {total === 0 ? (
          <Circle cx={cx} cy={cy} r={r} stroke={themeColors.border} strokeWidth={strokeWidth} fill="none" />
        ) : segments.map((seg, i) => (
          <Circle key={i} cx={cx} cy={cy} r={r} stroke={seg.color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={`${seg.dash} ${seg.gap}`} strokeDashoffset={-seg.offset} strokeLinecap="butt" />
        ))}
      </G>
      <SvgText x={cx} y={cy - 7} textAnchor="middle" fontSize={20} fontWeight="bold" fill={themeColors.foreground}>{total}</SvgText>
      <SvgText x={cx} y={cy + 11} textAnchor="middle" fontSize={10} fill={themeColors.mutedForeground}>total</SvgText>
    </Svg>
  );
}

function HorizontalBar({ data, colors: themeColors }: { data: { value: number; color: string; label: string }[]; colors: any }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.barTrack, { backgroundColor: themeColors.border }]}>
        <View style={{ flexDirection: "row", flex: 1, overflow: "hidden", borderRadius: 6 }}>
          {data.map((d, i) => (
            <View key={i} style={{ flex: d.value / total, backgroundColor: d.color, minWidth: d.value > 0 ? 2 : 0 }} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendText, { color: themeColors.mutedForeground }]}>
              {d.label} <Text style={{ color: themeColors.foreground, fontWeight: "700" }}>{d.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AlertRow({ icon, label, count, color, onPress, colors: themeColors }: any) {
  if (!count) return null;
  return (
    <TouchableOpacity
      style={[styles.alertRow, { backgroundColor: color + "10", borderColor: color + "35", borderRadius: themeColors.radius }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.alertIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.alertText, { color: themeColors.foreground }]}>{label}</Text>
      <View style={[styles.alertBadge, { backgroundColor: color }]}>
        <Text style={styles.alertBadgeText}>{count}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={color} />
    </TouchableOpacity>
  );
}

function NavTile({ icon, label, badge, color, onPress, colors: themeColors }: any) {
  return (
    <TouchableOpacity
      style={[styles.navTile, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderRadius: themeColors.radius }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.navTileIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      )}
      <Text style={[styles.navTileLabel, { color: themeColors.foreground }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data, isLoading } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey(), refetchInterval: 8_000 },
  });
  const s = data as any;

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["adminActivity"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 8_000,
  });
  const activity: ActivityItem[] = activityData?.activity ?? [];

  const { data: riskData } = useQuery({
    queryKey: ["adminTopRiskUsers"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/top-risk-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15_000,
  });
  const topRiskUsers: RiskUser[] = riskData?.users ?? [];

  const { data: suspendedData } = useQuery({
    queryKey: ["adminSuspendedPreview"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/suspended-users-preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 15_000,
  });
  const suspendedUsers: SuspendedUserPreview[] = suspendedData?.users ?? [];

  const dormData = [
    { value: s?.approvedDorms ?? 0, color: DORM_COLORS[0], label: DORM_LABELS[0] },
    { value: s?.pendingDorms ?? 0, color: DORM_COLORS[1], label: DORM_LABELS[1] },
    { value: s?.takenDownDorms ?? 0, color: DORM_COLORS[2], label: DORM_LABELS[2] },
  ];
  const userData = [
    { value: s?.totalBoarders ?? 0, color: USER_COLORS[0], label: USER_LABELS[0] },
    { value: s?.totalOwners ?? 0, color: USER_COLORS[1], label: USER_LABELS[1] },
    { value: s?.suspendedUsers ?? 0, color: USER_COLORS[2], label: USER_LABELS[2] },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Dashboard" subtitle="Aozora Admin Panel" />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {(s?.pendingDorms > 0 || s?.pendingVerifications > 0 || s?.pendingReports > 0 || s?.pendingSupportTickets > 0) && (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NEEDS ATTENTION</Text>
                <View style={{ gap: 8 }}>
                  <AlertRow icon="home" label="Dorm listings awaiting approval" count={s?.pendingDorms} color="#f59e0b" onPress={() => router.push("/admin/dorms")} colors={colors} />
                  <AlertRow icon="shield" label="ID verifications to review" count={s?.pendingVerifications} color="#ef4444" onPress={() => router.push("/admin/verifications")} colors={colors} />
                  <AlertRow icon="flag" label="Reports pending review" count={s?.pendingReports} color="#f97316" onPress={() => router.push("/admin/reports")} colors={colors} />
                  <AlertRow icon="message-square" label="Support tickets open" count={s?.pendingSupportTickets} color="#8b5cf6" onPress={() => router.push("/admin/support-tickets")} colors={colors} />
                </View>
              </View>
            )}

            {topRiskUsers.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.riskCardIcon, { backgroundColor: "#ef444418" }]}>
                      <Feather name="alert-triangle" size={15} color="#ef4444" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>High-Risk Users</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/admin/violations")} activeOpacity={0.7}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardSub, { color: colors.mutedForeground, marginBottom: 12 }]}>
                  Top {topRiskUsers.length} user{topRiskUsers.length !== 1 ? "s" : ""} by risk score
                </Text>
                <View style={{ gap: 10 }}>
                  {topRiskUsers.map((user, i) => {
                    const cfg = RISK_CONFIG[user.level];
                    const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    const rankColor = i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#f59e0b";
                    return (
                      <TouchableOpacity
                        key={user.userId}
                        style={[styles.riskRow, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
                        onPress={() => router.push({ pathname: "/admin/user-violations", params: { userId: user.userId } })}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.rankBadge, { backgroundColor: rankColor + "22" }]}>
                          <Text style={[styles.rankText, { color: rankColor }]}>#{i + 1}</Text>
                        </View>

                        <View style={[styles.riskAvatar, { backgroundColor: rankColor + "25" }]}>
                          <Text style={[styles.riskAvatarText, { color: rankColor }]}>{initials}</Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[styles.riskName, { color: colors.foreground }]} numberOfLines={1}>{user.name}</Text>
                            {user.isSuspended && (
                              <View style={styles.suspendedPill}>
                                <Text style={styles.suspendedText}>Suspended</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.riskMeta, { color: colors.mutedForeground }]}>
                            {user.violationCount} violation{user.violationCount !== 1 ? "s" : ""}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end", gap: 4 }}>
                          {cfg && (
                            <View style={[styles.levelPill, { backgroundColor: cfg.bg }]}>
                              <Text style={[styles.levelText, { color: cfg.color }]}>{cfg.label}</Text>
                            </View>
                          )}
                          <Text style={[styles.scoreText, { color: rankColor }]}>{user.score} pts</Text>
                        </View>

                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {suspendedUsers.length > 0 && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.riskCardIcon, { backgroundColor: "#ef444418" }]}>
                      <Feather name="user-x" size={15} color="#ef4444" />
                    </View>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Suspended Users</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/admin/suspended-users")} activeOpacity={0.7}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardSub, { color: colors.mutedForeground, marginBottom: 12 }]}>
                  {suspendedUsers.length} active suspension{suspendedUsers.length !== 1 ? "s" : ""}
                </Text>
                <View style={{ gap: 8 }}>
                  {suspendedUsers.slice(0, 4).map((user) => {
                    const countdown = suspendedCountdown(user);
                    const initials = user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                    const roleColor = user.role === "owner" ? "#8b5cf6" : user.role === "admin" ? "#ef4444" : "#0ea5e9";
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.suspRow, { backgroundColor: colors.secondary, borderColor: colors.border, borderRadius: colors.radius }]}
                        onPress={() => router.push({ pathname: "/admin/user-violations", params: { userId: user.id } })}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.riskAvatar, { backgroundColor: "#ef444422" }]}>
                          <Text style={[styles.riskAvatarText, { color: "#ef4444" }]}>{initials}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.riskName, { color: colors.foreground }]} numberOfLines={1}>{user.fullName}</Text>
                          <Text style={[styles.riskMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{user.email}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 3 }}>
                          <View style={[styles.levelPill, { backgroundColor: countdown.color + "18" }]}>
                            <Text style={[styles.levelText, { color: countdown.color }]}>{countdown.label}</Text>
                          </View>
                          <View style={[styles.levelPill, { backgroundColor: roleColor + "15" }]}>
                            <Text style={[styles.levelText, { color: roleColor }]}>{user.role}</Text>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Dorm Listings</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Status breakdown</Text>
              <View style={styles.donutRow}>
                <DonutChart data={dormData} colors={colors} />
                <View style={styles.donutLegend}>
                  {dormData.map((d, i) => (
                    <View key={i} style={styles.donutLegendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{d.label}</Text>
                        <Text style={[styles.donutValue, { color: colors.foreground }]}>{d.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Users</Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{s?.totalUsers ?? 0} registered</Text>
              <View style={{ marginTop: 14 }}>
                <HorizontalBar data={userData} colors={colors} />
              </View>
            </View>

            <View style={styles.twoStatRow}>
              <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.statPillIcon, { backgroundColor: "#4f46e510" }]}>
                  <Feather name="calendar" size={18} color="#4f46e5" />
                </View>
                <Text style={[styles.statPillValue, { color: colors.foreground }]}>{s?.totalAppointments ?? 0}</Text>
                <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Total Visits</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={[styles.statPillIcon, { backgroundColor: "#f59e0b10" }]}>
                  <Feather name="clock" size={18} color="#f59e0b" />
                </View>
                <Text style={[styles.statPillValue, { color: colors.foreground }]}>{s?.pendingAppointments ?? 0}</Text>
                <Text style={[styles.statPillLabel, { color: colors.mutedForeground }]}>Pending Visits</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT ACTIVITY</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, padding: 0, overflow: "hidden" }]}>
                {activityLoading ? (
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : activity.length === 0 ? (
                  <View style={{ padding: 24, alignItems: "center", gap: 6 }}>
                    <Feather name="activity" size={28} color={colors.mutedForeground} />
                    <Text style={[styles.emptyActivity, { color: colors.mutedForeground }]}>No activity yet</Text>
                  </View>
                ) : (
                  activity.map((item, i) => {
                    const color = ACTIVITY_COLOR[item.type] ?? "#64748b";
                    const icon = ACTIVITY_ICON[item.type] ?? "activity";
                    const isLast = i === activity.length - 1;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.activityRow,
                          !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                        ]}
                      >
                        <View style={[styles.activityIconWrap, { backgroundColor: color + "18" }]}>
                          <Feather name={icon} size={14} color={color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.activityLabel, { color: colors.foreground }]} numberOfLines={2}>{item.label}</Text>
                          <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{formatRelative(item.at)}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>MANAGE</Text>
              <View style={styles.navGrid}>
                <NavTile icon="users" label="Users" badge={s?.suspendedUsers} color="#0ea5e9" onPress={() => router.push("/admin/users")} colors={colors} />
                <NavTile icon="home" label="Dorm Approvals" badge={s?.pendingDorms} color="#10b981" onPress={() => router.push("/admin/dorms")} colors={colors} />
                <NavTile icon="shield" label="Verifications" badge={s?.pendingVerifications} color="#ef4444" onPress={() => router.push("/admin/verifications")} colors={colors} />
                <NavTile icon="flag" label="Reports" badge={s?.pendingReports} color="#f97316" onPress={() => router.push("/admin/reports")} colors={colors} />
                <NavTile icon="message-square" label="Support" badge={s?.pendingSupportTickets} color="#8b5cf6" onPress={() => router.push("/admin/support-tickets")} colors={colors} />
                <NavTile icon="user-x" label="Suspended" badge={s?.suspendedUsers} color="#ef4444" onPress={() => router.push("/admin/suspended-users")} colors={colors} />
                <NavTile icon="x-circle" label="Rejected Listings" badge={0} color="#64748b" onPress={() => router.push("/admin/rejected-listings")} colors={colors} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, gap: 14 },
  center: { paddingTop: 60, alignItems: "center" },
  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  alertIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  alertText: { flex: 1, fontSize: 13, fontWeight: "500" },
  alertBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  alertBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: { borderWidth: 1, padding: 16, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSub: { fontSize: 13 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 14 },
  donutLegend: { flex: 1, gap: 10 },
  donutLegendItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  donutValue: { fontSize: 18, fontWeight: "700", marginTop: 1 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 13 },
  barTrack: { height: 14, borderRadius: 7, overflow: "hidden" },
  twoStatRow: { flexDirection: "row", gap: 12 },
  statPill: { flex: 1, borderWidth: 1, padding: 16, gap: 6, alignItems: "flex-start" },
  statPillIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statPillValue: { fontSize: 26, fontWeight: "800" },
  statPillLabel: { fontSize: 12 },
  activityRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  activityIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  activityLabel: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  activityTime: { fontSize: 12, marginTop: 2 },
  emptyActivity: { fontSize: 14 },
  navGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  navTile: { width: "30.5%", borderWidth: 1, padding: 14, gap: 8, minWidth: 100 },
  navTileIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  navTileLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  riskCardIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  riskRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 11, fontWeight: "800" },
  riskAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  riskAvatarText: { fontSize: 13, fontWeight: "800" },
  riskName: { fontSize: 14, fontWeight: "600", flex: 1 },
  riskMeta: { fontSize: 12, marginTop: 2 },
  suspRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1 },
  suspendedPill: { backgroundColor: "#ef444418", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { fontSize: 10, fontWeight: "700", color: "#ef4444" },
  levelPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelText: { fontSize: 11, fontWeight: "700" },
  scoreText: { fontSize: 12, fontWeight: "800" },
});
