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

type FiledReport = {
  id: number;
  targetType: "user" | "dorm" | "review";
  targetId: number;
  targetName: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed";
  adminNote: string | null;
  warnedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReceivedReport = {
  id: number;
  targetType: "user" | "dorm" | "review";
  targetId: number;
  targetLabel: string | null;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  warnedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_META: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  pending:   { bg: "#f97316", text: "#fff", label: "Under Review", icon: "clock" },
  reviewed:  { bg: "#2563eb", text: "#fff", label: "Reviewed",     icon: "check-circle" },
  dismissed: { bg: "#6b7280", text: "#fff", label: "Dismissed",    icon: "x-circle" },
};

const TARGET_TYPE_LABEL: Record<string, string> = {
  user:   "User",
  dorm:   "Listing",
  review: "Review",
};

const TARGET_TYPE_ICON: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  user:   "user",
  dorm:   "home",
  review: "star",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [filed, setFiled] = useState<FiledReport[]>([]);
  const [received, setReceived] = useState<ReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"filed" | "received">("filed");

  const fetchReports = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/reports/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setFiled(data.filed ?? []);
      setReceived(data.received ?? []);
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
      fetchReports();
    }, [fetchReports])
  );

  const shown = tab === "filed" ? filed : received;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Reports</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["filed", "received"] as const).map((t) => {
          const count = t === "filed" ? filed.length : received.length;
          const isActive = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setTab(t)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                {t === "filed" ? "Filed by Me" : "About Me"}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.primary : colors.muted }]}>
                  <Text style={[styles.tabBadgeText, { color: isActive ? "#fff" : colors.mutedForeground }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "filed" && (
        <View style={[styles.infoBanner, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="flag" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Reports you've submitted to help keep Aozora safe.
          </Text>
        </View>
      )}

      {tab === "received" && (
        <View style={[styles.infoBanner, { backgroundColor: "#ef444408", borderColor: "#ef444425" }]}>
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text style={[styles.infoText, { color: "#ef4444" }]}>
            Reports filed against you or your content. Our team reviews each one.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : shown.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <Feather name="flag" size={32} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {tab === "filed" ? "No reports filed" : "No reports received"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            {tab === "filed"
              ? "You haven't filed any reports yet."
              : "No one has reported you or your content."}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchReports(); }}
              tintColor={colors.primary}
            />
          }
        >
          {tab === "filed"
            ? (filed as FiledReport[]).map((r) => <FiledCard key={r.id} report={r} colors={colors} />)
            : (received as ReceivedReport[]).map((r) => <ReceivedCard key={r.id} report={r} colors={colors} />)
          }
        </ScrollView>
      )}
    </View>
  );
}

function FiledCard({ report, colors }: { report: FiledReport; colors: any }) {
  const sm = STATUS_META[report.status] ?? STATUS_META.pending;
  const typeIcon = TARGET_TYPE_ICON[report.targetType] ?? "flag";
  const typeLabel = TARGET_TYPE_LABEL[report.targetType] ?? report.targetType;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.typeChip, { backgroundColor: colors.secondary }]}>
            <Feather name={typeIcon} size={12} color={colors.mutedForeground} />
            <Text style={[styles.typeChipText, { color: colors.mutedForeground }]}>{typeLabel}</Text>
          </View>
          {report.targetName && (
            <Text style={[styles.targetName, { color: colors.foreground }]} numberOfLines={1}>
              {report.targetName}
            </Text>
          )}
        </View>
        <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
          <Text style={[styles.statusText, { color: sm.text }]}>{sm.label}</Text>
        </View>
      </View>

      <Text style={[styles.reason, { color: colors.foreground }]}>{report.reason}</Text>

      {report.details ? (
        <Text style={[styles.details, { color: colors.mutedForeground }]} numberOfLines={2}>
          {report.details}
        </Text>
      ) : null}

      {report.warnedAt && (
        <View style={[styles.warnRow, { backgroundColor: "#f97316" + "15", borderColor: "#f97316" + "30" }]}>
          <Feather name="alert-triangle" size={13} color="#f97316" />
          <Text style={[styles.warnText, { color: "#f97316" }]}>
            Warning issued to reported party on {formatDate(report.warnedAt)}
          </Text>
        </View>
      )}

      {report.adminNote && report.status !== "pending" && (
        <View style={[styles.noteRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="message-square" size={13} color={colors.mutedForeground} />
          <Text style={[styles.noteText, { color: colors.mutedForeground }]} numberOfLines={3}>
            {report.adminNote}
          </Text>
        </View>
      )}

      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
        Filed {formatDate(report.createdAt)}
      </Text>
    </View>
  );
}

function ReceivedCard({ report, colors }: { report: ReceivedReport; colors: any }) {
  const sm = STATUS_META[report.status] ?? STATUS_META.pending;
  const typeIcon = TARGET_TYPE_ICON[report.targetType] ?? "flag";
  const typeLabel = TARGET_TYPE_LABEL[report.targetType] ?? report.targetType;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.typeChip, { backgroundColor: colors.secondary }]}>
            <Feather name={typeIcon} size={12} color={colors.mutedForeground} />
            <Text style={[styles.typeChipText, { color: colors.mutedForeground }]}>
              {report.targetType === "user" ? "Your Account" : typeLabel}
              {report.targetLabel ? ` · ${report.targetLabel}` : ""}
            </Text>
          </View>
        </View>
        <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
          <Text style={[styles.statusText, { color: sm.text }]}>{sm.label}</Text>
        </View>
      </View>

      <Text style={[styles.reason, { color: colors.foreground }]}>{report.reason}</Text>

      {report.warnedAt && (
        <View style={[styles.warnRow, { backgroundColor: "#ef4444" + "12", borderColor: "#ef4444" + "30" }]}>
          <Feather name="alert-triangle" size={13} color="#ef4444" />
          <Text style={[styles.warnText, { color: "#ef4444" }]}>
            An official warning was issued to your account on {formatDate(report.warnedAt)}
          </Text>
        </View>
      )}

      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
        Reported on {formatDate(report.createdAt)}
      </Text>
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
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  tabText: { fontSize: 15, fontWeight: "600" },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeText: { fontSize: 11, fontWeight: "700" },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTopLeft: { flex: 1, gap: 4 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  typeChipText: { fontSize: 12, fontWeight: "500" },
  targetName: { fontSize: 14, fontWeight: "600" },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  statusText: { fontSize: 12, fontWeight: "700" },
  reason: { fontSize: 15, fontWeight: "600" },
  details: { fontSize: 13, lineHeight: 18 },
  warnRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  warnText: { fontSize: 13, flex: 1, lineHeight: 18, fontWeight: "500" },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteText: { fontSize: 13, flex: 1, lineHeight: 18 },
  dateText: { fontSize: 12 },
});
