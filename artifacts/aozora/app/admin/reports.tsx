import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const FILTERS = ["all", "pending", "reviewed", "dismissed"] as const;
type Filter = typeof FILTERS[number];

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  reviewed: "Reviewed",
  dismissed: "Dismissed",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  reviewed: "#10b981",
  dismissed: "#9ca3af",
};

const TARGET_ICONS: Record<string, string> = {
  user: "user",
  dorm: "home",
  review: "star",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ActionType = "warn" | "suspend" | "takedown" | "status";

export default function AdminReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [actionLoading, setActionLoading] = useState<Record<string, ActionType | null>>({});

  const reportsKey = ["adminReports", filter];

  const { data, isLoading, refetch } = useQuery({
    queryKey: reportsKey,
    queryFn: async () => {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${BASE_URL}/api/admin/reports${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const reports: any[] = data?.reports ?? [];

  const setLoading = (reportId: number, action: ActionType | null) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: action }));
  };

  const updateStatus = async (reportId: number, newStatus: string) => {
    setLoading(reportId, "status");
    try {
      const res = await fetch(`${BASE_URL}/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      qc.invalidateQueries({ queryKey: ["adminReports"] });
    } catch {
      Alert.alert("Error", "Could not update report status.");
    } finally {
      setLoading(reportId, null);
    }
  };

  const sendWarning = async (reportId: number, targetUserName: string | null) => {
    const name = targetUserName ?? "this user";
    Alert.alert(
      "Send Warning",
      `Send an official warning message to ${name}? The report details will be included automatically and the report will be marked as reviewed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Warning",
          onPress: async () => {
            setLoading(reportId, "warn");
            try {
              const res = await fetch(`${BASE_URL}/api/admin/reports/${reportId}/warn`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Failed to send warning");
              }
              qc.invalidateQueries({ queryKey: ["adminReports"] });
              Alert.alert("Warning Sent", `A warning message has been sent to ${name}.`);
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Could not send warning.");
            } finally {
              setLoading(reportId, null);
            }
          },
        },
      ]
    );
  };

  const takeDownListing = async (reportId: number, dormName: string | null) => {
    const name = dormName ?? "this listing";
    Alert.alert(
      "Take Down Listing",
      `Remove "${name}" from Aozora? The listing will be hidden from students immediately and the report will be marked as reviewed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Down",
          style: "destructive",
          onPress: async () => {
            setLoading(reportId, "takedown");
            try {
              const res = await fetch(`${BASE_URL}/api/admin/reports/${reportId}/takedown`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Failed to take down listing");
              }
              qc.invalidateQueries({ queryKey: ["adminReports"] });
              Alert.alert("Listing Removed", `"${name}" has been taken down and is no longer visible to students.`);
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Could not take down listing.");
            } finally {
              setLoading(reportId, null);
            }
          },
        },
      ]
    );
  };

  const suspendUser = async (reportId: number, targetUserName: string | null) => {
    const name = targetUserName ?? "this user";
    Alert.alert(
      "Suspend User",
      `Suspend ${name}'s account? They will immediately lose access to Aozora. The report will be marked as reviewed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            setLoading(reportId, "suspend");
            try {
              const res = await fetch(`${BASE_URL}/api/admin/reports/${reportId}/suspend`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Failed to suspend user");
              }
              qc.invalidateQueries({ queryKey: ["adminReports"] });
              Alert.alert("User Suspended", `${name}'s account has been suspended.`);
            } catch (e: any) {
              Alert.alert("Error", e.message ?? "Could not suspend user.");
            } finally {
              setLoading(reportId, null);
            }
          },
        },
      ]
    );
  };

  const renderReport = ({ item }: { item: any }) => {
    const iconName = (TARGET_ICONS[item.target_type] ?? "alert-circle") as any;
    const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    const currentAction = actionLoading[item.id] ?? null;
    const isAnyLoading = currentAction !== null;
    const isDismissed = item.status === "dismissed";
    const alreadyWarned = !!item.warned_at;
    const alreadyTakenDown = !!item.taken_down_at;
    const isDormReport = item.target_type === "dorm";

    // Subtitle shown under the target ID
    const targetSubtitle = isDormReport
      ? item.target_dorm_name ?? null
      : item.target_user_name ?? null;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Target info */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name={iconName} size={16} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.targetLabel, { color: colors.foreground }]}>
              {item.target_type.charAt(0).toUpperCase() + item.target_type.slice(1)} #{item.target_id}
              {targetSubtitle ? (
                <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>
                  {" "}· {targetSubtitle}
                </Text>
              ) : null}
            </Text>
            {isDormReport && item.target_user_name ? (
              <Text style={[styles.dormOwnerLine, { color: colors.mutedForeground }]}>
                Owner: {item.target_user_name}
              </Text>
            ) : null}
            <Text style={[styles.reportDate, { color: colors.mutedForeground }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Reporter */}
        <View style={[styles.infoRow, { borderColor: colors.border }]}>
          <Feather name="user" size={13} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Reported by{" "}
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>
              {item.reporter_name ?? "Unknown"}
            </Text>
            {item.reporter_email ? ` (${item.reporter_email})` : ""}
          </Text>
        </View>

        {/* Reason */}
        <View style={[styles.reasonRow, { backgroundColor: "#ef444410", borderColor: "#ef444430" }]}>
          <Feather name="flag" size={13} color="#ef4444" />
          <Text style={[styles.reasonText, { color: colors.foreground }]}>{item.reason}</Text>
        </View>

        {/* Details */}
        {item.details ? (
          <Text style={[styles.details, { color: colors.mutedForeground }]}>
            "{item.details}"
          </Text>
        ) : null}

        {/* Quick action row — buttons differ by report type */}
        <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
          {isDormReport ? (
            <>
              {/* Warn Owner — locks after first use */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  isDismissed || alreadyWarned
                    ? { backgroundColor: colors.secondary, borderColor: colors.border }
                    : { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" },
                ]}
                onPress={() => sendWarning(item.id, item.target_user_name)}
                disabled={isAnyLoading || isDismissed || alreadyWarned}
              >
                {currentAction === "warn" ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <>
                    <Feather
                      name="alert-triangle"
                      size={14}
                      color={isDismissed || alreadyWarned ? colors.mutedForeground : "#f59e0b"}
                    />
                    <Text style={[styles.quickBtnText, { color: isDismissed || alreadyWarned ? colors.mutedForeground : "#f59e0b" }]}>
                      {alreadyWarned ? "Owner Warned" : "Warn Owner"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Take Down Listing — locks after first use */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  isDismissed || alreadyTakenDown
                    ? { backgroundColor: colors.secondary, borderColor: colors.border }
                    : { backgroundColor: "#ef444418", borderColor: "#ef444440" },
                ]}
                onPress={() => takeDownListing(item.id, item.target_dorm_name)}
                disabled={isAnyLoading || isDismissed || alreadyTakenDown}
              >
                {currentAction === "takedown" ? (
                  <ActivityIndicator size="small" color={isDismissed || alreadyTakenDown ? colors.mutedForeground : "#ef4444"} />
                ) : (
                  <>
                    <Feather
                      name="trash-2"
                      size={14}
                      color={isDismissed || alreadyTakenDown ? colors.mutedForeground : "#ef4444"}
                    />
                    <Text style={[styles.quickBtnText, { color: isDismissed || alreadyTakenDown ? colors.mutedForeground : "#ef4444" }]}>
                      {alreadyTakenDown ? "Taken Down" : "Take Down"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Warn — locks after first use */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  isDismissed || alreadyWarned
                    ? { backgroundColor: colors.secondary, borderColor: colors.border }
                    : { backgroundColor: "#f59e0b18", borderColor: "#f59e0b40" },
                ]}
                onPress={() => sendWarning(item.id, item.target_user_name)}
                disabled={isAnyLoading || isDismissed || alreadyWarned}
              >
                {currentAction === "warn" ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <>
                    <Feather
                      name="alert-triangle"
                      size={14}
                      color={isDismissed || alreadyWarned ? colors.mutedForeground : "#f59e0b"}
                    />
                    <Text style={[styles.quickBtnText, { color: isDismissed || alreadyWarned ? colors.mutedForeground : "#f59e0b" }]}>
                      {alreadyWarned ? "Warned" : "Warn"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Suspend — disabled if dismissed */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  isDismissed
                    ? { backgroundColor: colors.secondary, borderColor: colors.border }
                    : { backgroundColor: "#ef444418", borderColor: "#ef444440" },
                ]}
                onPress={() => suspendUser(item.id, item.target_user_name)}
                disabled={isAnyLoading || isDismissed}
              >
                {currentAction === "suspend" ? (
                  <ActivityIndicator size="small" color={isDismissed ? colors.mutedForeground : "#ef4444"} />
                ) : (
                  <>
                    <Feather
                      name="slash"
                      size={14}
                      color={isDismissed ? colors.mutedForeground : "#ef4444"}
                    />
                    <Text style={[styles.quickBtnText, { color: isDismissed ? colors.mutedForeground : "#ef4444" }]}>
                      Suspend
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Status actions */}
        {item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10b98118", borderColor: "#10b98140" }]}
              onPress={() => updateStatus(item.id, "reviewed")}
              disabled={isAnyLoading}
            >
              {currentAction === "status" ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <Feather name="check" size={14} color="#10b981" />
                  <Text style={[styles.actionBtnText, { color: "#10b981" }]}>Mark Reviewed</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => updateStatus(item.id, "dismissed")}
              disabled={isAnyLoading}
            >
              <Feather name="x" size={14} color={colors.mutedForeground} />
              <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
        {item.status !== "pending" && (
          <TouchableOpacity
            onPress={() => updateStatus(item.id, "pending")}
            style={styles.reopenBtn}
            disabled={isAnyLoading}
          >
            <Text style={[styles.reopenText, { color: colors.mutedForeground }]}>Reopen as pending</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>User Reports</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {data?.total ?? 0} report{(data?.total ?? 0) !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={styles.backBtn}>
          <Feather name="refresh-cw" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterTab,
              filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: filter === f ? colors.primary : colors.mutedForeground },
                filter === f && { fontWeight: "700" },
              ]}
            >
              {FILTER_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.center}>
          <Feather name="shield" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No {filter !== "all" ? filter : ""} reports
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderReport}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        />
      )}
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
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 19, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 1 },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabText: { fontSize: 13, fontWeight: "500" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 16 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardHeaderText: { flex: 1 },
  targetLabel: { fontSize: 14, fontWeight: "700" },
  dormOwnerLine: { fontSize: 12, marginTop: 1 },
  reportDate: { fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasonText: { fontSize: 13, fontWeight: "600", flex: 1 },
  details: { fontSize: 13, fontStyle: "italic", lineHeight: 18, paddingHorizontal: 2 },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  quickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  reopenBtn: { alignSelf: "flex-start" },
  reopenText: { fontSize: 12, textDecorationLine: "underline" },
});
