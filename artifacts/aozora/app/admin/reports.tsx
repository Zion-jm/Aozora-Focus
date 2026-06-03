import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
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

const CATEGORIES: { value: string; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { value: "harassment",            label: "Harassment or Bullying",         icon: "alert-octagon" },
  { value: "spam",                  label: "Spam or Unsolicited Messages",    icon: "mail" },
  { value: "fake_listing",          label: "Fraudulent Dorm Listing",         icon: "home" },
  { value: "fake_identity",         label: "Identity Misrepresentation",      icon: "user-x" },
  { value: "hate_speech",           label: "Hate Speech or Discrimination",   icon: "message-square" },
  { value: "inappropriate_content", label: "Inappropriate Content",           icon: "eye-off" },
  { value: "no_show",               label: "Repeated Appointment No-Shows",   icon: "calendar" },
  { value: "other",                 label: "Other Violation",                 icon: "more-horizontal" },
];

const SEVERITY_CONFIG: Record<number, { label: string; color: string; bg: string; points: number }> = {
  1: { label: "Low",      color: "#10b981", bg: "#10b98115", points: 1  },
  2: { label: "Medium",   color: "#f59e0b", bg: "#f59e0b15", points: 3  },
  3: { label: "High",     color: "#f97316", bg: "#f9731615", points: 6  },
  4: { label: "Critical", color: "#ef4444", bg: "#ef444415", points: 10 },
};

const RECOMMENDATIONS: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  clean:            { label: "Clean Record",      color: "#10b981", bg: "#10b98112", icon: "check-circle"  },
  warning:          { label: "Formal Warning",    color: "#f59e0b", bg: "#f59e0b12", icon: "alert-triangle" },
  short_suspension: { label: "7-Day Suspension",  color: "#f97316", bg: "#f9731612", icon: "clock"         },
  long_suspension:  { label: "30-Day Suspension", color: "#ef4444", bg: "#ef444412", icon: "user-x"        },
  ban:              { label: "Permanent Ban",      color: "#7c3aed", bg: "#7c3aed12", icon: "slash"         },
};

const SCORE_LABELS: Record<string, string> = {
  clean:            "No action needed — user has a clean record.",
  warning:          "Score suggests issuing a formal warning to the user.",
  short_suspension: "Score suggests a short suspension of 7 days.",
  long_suspension:  "Score suggests a longer suspension of 30 days.",
  ban:              "Score suggests a permanent ban from the platform.",
};

function reasonToCategory(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("harassment") || r.includes("bully") || r.includes("threat") || r.includes("violence")) return "harassment";
  if (r.includes("spam") || r.includes("unsolicited")) return "spam";
  if (r.includes("fake") || r.includes("fraud") || r.includes("scam")) return "fake_listing";
  if (r.includes("identity") || r.includes("impersonat")) return "fake_identity";
  if (r.includes("hate") || r.includes("discriminat")) return "hate_speech";
  if (r.includes("inappropriate") || r.includes("content")) return "inappropriate_content";
  if (r.includes("no show") || r.includes("no-show") || r.includes("appointment")) return "no_show";
  return "other";
}

function reasonToSeverity(reason: string): number {
  const r = reason.toLowerCase();
  if (r.includes("threat") || r.includes("violence") || r.includes("hate")) return 3;
  if (r.includes("harassment") || r.includes("fraud") || r.includes("scam") || r.includes("fake")) return 2;
  return 1;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [takedownLoading, setTakedownLoading] = useState<Record<number, boolean>>({});
  const [statusLoading, setStatusLoading] = useState<Record<number, boolean>>({});

  const [logModal, setLogModal] = useState<any | null>(null);
  const [modalPhase, setModalPhase] = useState<"form" | "recommendation">("form");
  const [recResult, setRecResult] = useState<{
    userId: number;
    userName: string;
    score: number;
    level: string;
  } | null>(null);
  const [logCategory, setLogCategory] = useState("harassment");
  const [logSeverity, setLogSeverity] = useState(1);
  const [logDescription, setLogDescription] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [recApplied, setRecApplied] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminReports", filter],
    queryFn: async () => {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`${BASE_URL}/api/admin/reports${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 8_000,
  });

  const allReports: any[] = data?.reports ?? [];
  const reports = useMemo(() => {
    if (!search.trim()) return allReports;
    const q = search.toLowerCase();
    return allReports.filter(
      (r: any) =>
        r.reporter_name?.toLowerCase().includes(q) ||
        r.reporter_email?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q) ||
        r.details?.toLowerCase().includes(q) ||
        r.target_dorm_name?.toLowerCase().includes(q) ||
        r.target_user_name?.toLowerCase().includes(q)
    );
  }, [allReports, search]);

  const updateStatus = async (reportId: number, newStatus: string) => {
    setStatusLoading((p) => ({ ...p, [reportId]: true }));
    try {
      const res = await fetch(`${BASE_URL}/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      qc.invalidateQueries({ queryKey: ["adminReports"] });
    } catch {
      toast.error("Error", "Could not update report status.");
    } finally {
      setStatusLoading((p) => ({ ...p, [reportId]: false }));
    }
  };

  const takeDownListing = (reportId: number, dormName: string | null) => {
    const name = dormName ?? "this listing";
    showConfirm({
      title: "Take Down Listing",
      message: `Remove "${name}" from Aozora? The listing will be hidden immediately and the report will be marked as reviewed.`,
      confirmLabel: "Take Down",
      destructive: true,
      icon: "home",
      onConfirm: async () => {
        setTakedownLoading((p) => ({ ...p, [reportId]: true }));
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
          toast.success("Listing Removed", `"${name}" has been taken down.`);
        } catch (e: any) {
          toast.error("Error", e.message ?? "Could not take down listing.");
        } finally {
          setTakedownLoading((p) => ({ ...p, [reportId]: false }));
        }
      },
    });
  };

  const openLogModal = (report: any) => {
    setLogCategory(reasonToCategory(report.reason));
    setLogSeverity(reasonToSeverity(report.reason));
    setLogDescription(
      `Reported for: ${report.reason}` +
        (report.details ? `\n\nDetails: ${report.details}` : "")
    );
    setLogNotes("");
    setModalPhase("form");
    setRecResult(null);
    setRecApplied(false);
    setLogModal(report);
  };

  const handleLogViolation = async () => {
    if (!logModal) return;
    if (!logDescription.trim()) {
      toast.error("Required", "Please enter a description.");
      return;
    }
    setLogLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/admin/reports/${logModal.id}/log-violation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            category: logCategory,
            severity: logSeverity,
            description: logDescription.trim(),
            notes: logNotes.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to log violation");
      }
      const result = await res.json();
      setRecResult({
        userId: result.userId,
        userName: result.userName,
        score: result.score,
        level: result.level,
      });
      toast.success("Violation Logged", `Violation recorded for ${result.userName}.`);
      setModalPhase("recommendation");
      qc.invalidateQueries({ queryKey: ["adminReports"] });
    } catch (e: any) {
      toast.error("Error", e.message ?? "Could not log violation.");
    } finally {
      setLogLoading(false);
    }
  };

  const handleApplyRecommendation = async () => {
    if (!recResult || recApplied) return;
    setApplyLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/admin/violations/apply-recommendation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: recResult.userId,
            level: recResult.level,
            infractionDescription: logDescription.trim() || undefined,
          }),
        }
      );
      if (res.status === 409) {
        setRecApplied(true);
        toast.info("Already Applied", "A recommendation has already been applied for this user.");
        return;
      }
      if (!res.ok) throw new Error("Failed to apply recommendation");
      const rec = RECOMMENDATIONS[recResult.level] ?? RECOMMENDATIONS["warning"]!;
      setRecApplied(true);
      toast.success("Action Applied", `${rec.label} applied to ${recResult.userName}.`);
      qc.invalidateQueries({ queryKey: ["adminReports"] });
    } catch (e: any) {
      toast.error("Error", e.message ?? "Could not apply recommendation.");
    } finally {
      setApplyLoading(false);
    }
  };

  const renderReport = ({ item }: { item: any }) => {
    const iconName = (TARGET_ICONS[item.target_type] ?? "alert-circle") as any;
    const statusColor = STATUS_COLORS[item.status] ?? colors.mutedForeground;
    const isDismissed = item.status === "dismissed";
    const alreadyTakenDown = !!item.taken_down_at;
    const alreadyViolationLogged = !!item.violation_logged_at;
    const isDormReport = item.target_type === "dorm";
    const targetSubtitle = isDormReport
      ? item.target_dorm_name ?? null
      : item.target_user_name ?? null;
    const isTakedownLoading = !!takedownLoading[item.id];
    const isStatusLoading = !!statusLoading[item.id];

    const logBtnDisabled = isDismissed || alreadyViolationLogged;
    const logBtnColor = logBtnDisabled ? colors.mutedForeground : colors.primary;
    const logBtnBg = logBtnDisabled
      ? { backgroundColor: colors.secondary, borderColor: colors.border }
      : { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" };

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

        {/* Actions */}
        <View style={[styles.quickActions, { borderTopColor: colors.border }]}>
          {isDormReport ? (
            <>
              {/* Log violation against owner */}
              <TouchableOpacity
                style={[styles.quickBtn, logBtnBg]}
                onPress={() => openLogModal(item)}
                disabled={logBtnDisabled || isTakedownLoading}
              >
                <Feather
                  name={alreadyViolationLogged ? "check" : "shield"}
                  size={14}
                  color={logBtnColor}
                />
                <Text style={[styles.quickBtnText, { color: logBtnColor }]}>
                  {alreadyViolationLogged ? "Violation Logged" : "Log Violation"}
                </Text>
              </TouchableOpacity>

              {/* Take Down */}
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  isDismissed || alreadyTakenDown
                    ? { backgroundColor: colors.secondary, borderColor: colors.border }
                    : { backgroundColor: "#ef444418", borderColor: "#ef444440" },
                ]}
                onPress={() => takeDownListing(item.id, item.target_dorm_name)}
                disabled={isTakedownLoading || isDismissed || alreadyTakenDown}
              >
                {isTakedownLoading ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <>
                    <Feather
                      name={alreadyTakenDown ? "check" : "trash-2"}
                      size={14}
                      color={isDismissed || alreadyTakenDown ? colors.mutedForeground : "#ef4444"}
                    />
                    <Text
                      style={[
                        styles.quickBtnText,
                        { color: isDismissed || alreadyTakenDown ? colors.mutedForeground : "#ef4444" },
                      ]}
                    >
                      {alreadyTakenDown ? "Taken Down" : "Take Down"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // User/review report — single full-width Log Violation button
            <TouchableOpacity
              style={[styles.logViolationBtn, logBtnBg]}
              onPress={() => openLogModal(item)}
              disabled={logBtnDisabled}
            >
              <Feather
                name={alreadyViolationLogged ? "check-circle" : "shield"}
                size={15}
                color={logBtnColor}
              />
              <Text style={[styles.logViolationBtnText, { color: logBtnColor }]}>
                {alreadyViolationLogged ? "Violation Logged" : "Log Violation"}
              </Text>
              {!alreadyViolationLogged && !isDismissed && (
                <Feather name="arrow-right" size={14} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Status actions */}
        {item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              onPress={() => updateStatus(item.id, "dismissed")}
              disabled={isStatusLoading}
            >
              {isStatusLoading ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : (
                <>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Dismiss</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        {item.status !== "pending" && (
          <TouchableOpacity
            onPress={() => updateStatus(item.id, "pending")}
            style={styles.reopenBtn}
            disabled={isStatusLoading}
          >
            <Text style={[styles.reopenText, { color: colors.mutedForeground }]}>Reopen as pending</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const rec = recResult ? RECOMMENDATIONS[recResult.level] ?? RECOMMENDATIONS["warning"]! : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="User Reports"
        subtitle={`${data?.total ?? 0} report${(data?.total ?? 0) !== 1 ? "s" : ""}`}
        right={
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        }
      />

      <View
        style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}
      >
        <View
          style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search reporter, reason, or target…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterBtn,
              { borderRadius: 20 },
              filter === f && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: filter === f ? "#fff" : colors.mutedForeground },
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

      {/* ── Log Violation Modal ── */}
      <Modal
        visible={!!logModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLogModal(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setLogModal(null)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {modalPhase === "form" ? "Log Violation" : "System Recommendation"}
              </Text>
              <View style={{ width: 36 }} />
            </View>

            {modalPhase === "form" ? (
              /* ── Phase 1: Form ── */
              <ScrollView
                contentContainerStyle={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Report context */}
                {logModal && (
                  <View
                    style={[styles.reportCtx, { backgroundColor: "#ef444410", borderColor: "#ef444430" }]}
                  >
                    <Feather name="flag" size={14} color="#ef4444" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reportCtxLabel, { color: colors.mutedForeground }]}>
                        Report reason
                      </Text>
                      <Text style={[styles.reportCtxReason, { color: colors.foreground }]}>
                        {logModal.reason}
                      </Text>
                      {logModal.target_user_name && (
                        <Text style={[styles.reportCtxUser, { color: colors.mutedForeground }]}>
                          Against: {logModal.target_user_name}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Category */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  VIOLATION CATEGORY
                </Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => setLogCategory(c.value)}
                      style={[
                        styles.categoryItem,
                        {
                          borderColor: logCategory === c.value ? colors.primary : colors.border,
                          backgroundColor:
                            logCategory === c.value ? colors.primary + "12" : colors.card,
                          borderRadius: 10,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={c.icon}
                        size={14}
                        color={logCategory === c.value ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.categoryItemText,
                          { color: logCategory === c.value ? colors.primary : colors.foreground },
                        ]}
                        numberOfLines={2}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Severity */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SEVERITY</Text>
                <View style={styles.severityRow}>
                  {([1, 2, 3, 4] as const).map((s) => {
                    const cfg = SEVERITY_CONFIG[s]!;
                    const active = logSeverity === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setLogSeverity(s)}
                        style={[
                          styles.severityBtn,
                          {
                            borderColor: active ? cfg.color : colors.border,
                            backgroundColor: active ? cfg.bg : colors.card,
                            borderRadius: 10,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityBtnLabel,
                            { color: active ? cfg.color : colors.mutedForeground },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                        <Text
                          style={[
                            styles.severityBtnPts,
                            { color: active ? cfg.color : colors.mutedForeground },
                          ]}
                        >
                          {cfg.points} pt{cfg.points > 1 ? "s" : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Description */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DESCRIPTION</Text>
                <TextInput
                  style={[
                    styles.descInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                    },
                  ]}
                  value={logDescription}
                  onChangeText={setLogDescription}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe the violation…"
                  placeholderTextColor={colors.mutedForeground}
                  textAlignVertical="top"
                />

                {/* Notes */}
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                  ADMIN NOTES (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.descInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.foreground,
                      minHeight: 64,
                    },
                  ]}
                  value={logNotes}
                  onChangeText={setLogNotes}
                  multiline
                  placeholder="Internal notes, not shown to the user…"
                  placeholderTextColor={colors.mutedForeground}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: colors.primary, opacity: logLoading ? 0.6 : 1 },
                  ]}
                  onPress={handleLogViolation}
                  disabled={logLoading}
                >
                  {logLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="shield" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Log Violation</Text>
                      <Feather name="arrow-right" size={16} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              /* ── Phase 2: Recommendation ── */
              <ScrollView
                contentContainerStyle={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {/* Success banner */}
                <View
                  style={[
                    styles.recSuccessBanner,
                    { backgroundColor: "#10b98112", borderColor: "#10b98130" },
                  ]}
                >
                  <Feather name="check-circle" size={20} color="#10b981" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recSuccessTitle, { color: "#10b981" }]}>
                      Violation recorded
                    </Text>
                    {recResult && (
                      <Text style={[styles.recSuccessSub, { color: colors.mutedForeground }]}>
                        Against {recResult.userName} · New score:{" "}
                        {recResult.score.toFixed(1)} pts
                      </Text>
                    )}
                  </View>
                </View>

                {/* Recommendation card */}
                {rec && recResult && (
                  <View
                    style={[
                      styles.recCard,
                      { backgroundColor: rec.bg, borderColor: rec.color + "40" },
                    ]}
                  >
                    <View style={styles.recCardHeader}>
                      <Feather name={rec.icon} size={20} color={rec.color} />
                      <Text style={[styles.recLevel, { color: rec.color }]}>{rec.label}</Text>
                    </View>
                    <Text style={[styles.recDesc, { color: colors.foreground }]}>
                      {SCORE_LABELS[recResult.level]}
                    </Text>
                    <View style={styles.recScoreRow}>
                      <Text style={[styles.recScoreLabel, { color: colors.mutedForeground }]}>
                        Total risk score
                      </Text>
                      <Text style={[styles.recScoreValue, { color: rec.color }]}>
                        {recResult.score.toFixed(1)} pts
                      </Text>
                    </View>
                  </View>
                )}

                {recResult && recResult.level !== "clean" ? (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.submitBtn,
                        {
                          backgroundColor: recApplied ? "#10b981" : (rec?.color ?? colors.primary),
                          opacity: applyLoading ? 0.6 : 1,
                          marginTop: 8,
                        },
                      ]}
                      onPress={handleApplyRecommendation}
                      disabled={applyLoading || recApplied}
                    >
                      {applyLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : recApplied ? (
                        <>
                          <Feather name="check-circle" size={16} color="#fff" />
                          <Text style={styles.submitBtnText}>Applied ✓</Text>
                        </>
                      ) : (
                        <>
                          <Feather name={rec?.icon ?? "shield"} size={16} color="#fff" />
                          <Text style={styles.submitBtnText}>Apply: {rec?.label}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.skipBtn, { borderColor: colors.border }]}
                      onPress={() => setLogModal(null)}
                    >
                      <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>
                        {recApplied ? "Close" : "Skip for now"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: "#10b981", marginTop: 8 }]}
                    onPress={() => setLogModal(null)}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Done</Text>
                  </TouchableOpacity>
                )}

                {recResult && (
                  <TouchableOpacity
                    style={styles.viewViolationsLink}
                    onPress={() => {
                      setLogModal(null);
                      router.push(
                        `/admin/user-violations?userId=${recResult.userId}&userName=${encodeURIComponent(recResult.userName)}`
                      );
                    }}
                  >
                    <Text style={[styles.viewViolationsText, { color: colors.primary }]}>
                      View full violation record →
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterBtnText: { fontSize: 13, fontWeight: "600" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
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
  logViolationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  logViolationBtnText: { fontSize: 14, fontWeight: "700", flex: 1 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  reopenBtn: { alignItems: "center", paddingTop: 4 },
  reopenText: { fontSize: 12, fontWeight: "500" },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalBody: { padding: 20, gap: 16, paddingBottom: 48 },

  // Report context banner
  reportCtx: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reportCtxLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3, marginBottom: 2 },
  reportCtxReason: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  reportCtxUser: { fontSize: 12, marginTop: 2 },

  // Form fields
  fieldLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: -8 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1.5,
  },
  categoryItemText: { fontSize: 12, fontWeight: "500", flex: 1 },
  severityRow: { flexDirection: "row", gap: 8 },
  severityBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  severityBtnLabel: { fontSize: 12, fontWeight: "700" },
  severityBtnPts: { fontSize: 10, marginTop: 2, fontWeight: "500" },
  descInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 96,
    lineHeight: 20,
  },

  // Submit / skip
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  skipBtnText: { fontSize: 14, fontWeight: "600" },

  // Recommendation phase
  recSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  recSuccessTitle: { fontSize: 14, fontWeight: "700" },
  recSuccessSub: { fontSize: 13, marginTop: 2 },
  recCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  recCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  recLevel: { fontSize: 17, fontWeight: "800" },
  recDesc: { fontSize: 14, lineHeight: 20 },
  recScoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  recScoreLabel: { fontSize: 13, fontWeight: "500" },
  recScoreValue: { fontSize: 18, fontWeight: "800" },
  viewViolationsLink: { alignItems: "center", paddingVertical: 8 },
  viewViolationsText: { fontSize: 14, fontWeight: "600" },
});
