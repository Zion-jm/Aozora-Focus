import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CATEGORIES: { value: string; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { value: "harassment", label: "Harassment or Bullying", icon: "alert-octagon" },
  { value: "spam", label: "Spam or Unsolicited Messages", icon: "mail" },
  { value: "fake_listing", label: "Fraudulent Dorm Listing", icon: "home" },
  { value: "fake_identity", label: "Identity Misrepresentation", icon: "user-x" },
  { value: "hate_speech", label: "Hate Speech or Discrimination", icon: "message-square" },
  { value: "inappropriate_content", label: "Inappropriate Content", icon: "eye-off" },
  { value: "no_show", label: "Repeated Appointment No-Shows", icon: "calendar" },
  { value: "other", label: "Other Violation", icon: "more-horizontal" },
];

const SEVERITY_CONFIG: Record<number, { label: string; color: string; bg: string; points: number }> = {
  1: { label: "Low", color: "#10b981", bg: "#10b98115", points: 1 },
  2: { label: "Medium", color: "#f59e0b", bg: "#f59e0b15", points: 3 },
  3: { label: "High", color: "#f97316", bg: "#f9731615", points: 6 },
  4: { label: "Critical", color: "#ef4444", bg: "#ef444415", points: 10 },
};

const RECOMMENDATIONS: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  clean:            { label: "Clean Record",              color: "#10b981", bg: "#10b98112", icon: "check-circle" },
  warning:          { label: "Formal Warning",            color: "#f59e0b", bg: "#f59e0b12", icon: "alert-triangle" },
  short_suspension: { label: "7-Day Suspension",          color: "#f97316", bg: "#f9731612", icon: "clock" },
  long_suspension:  { label: "30-Day Suspension",         color: "#ef4444", bg: "#ef444412", icon: "user-x" },
  ban:              { label: "Permanent Ban",              color: "#7c3aed", bg: "#7c3aed12", icon: "slash" },
};

const SCORE_LABELS: Record<string, string> = {
  clean:            "No action needed. User has a clean record.",
  warning:          "Score suggests issuing a formal warning to the user.",
  short_suspension: "Score suggests a short suspension of 7 days.",
  long_suspension:  "Score suggests a longer suspension of 30 days.",
  ban:              "Score suggests a permanent ban from the platform.",
};

function CategoryPicker({ value, onChange, colors }: { value: string; onChange: (v: string) => void; colors: any }) {
  return (
    <View style={styles.pickerGrid}>
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c.value}
          onPress={() => onChange(c.value)}
          style={[
            styles.pickerItem,
            {
              borderColor: value === c.value ? colors.primary : colors.border,
              backgroundColor: value === c.value ? colors.primary + "12" : colors.secondary,
              borderRadius: 10,
            },
          ]}
          activeOpacity={0.75}
        >
          <Feather
            name={c.icon}
            size={15}
            color={value === c.value ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.pickerItemText,
              { color: value === c.value ? colors.primary : colors.foreground },
            ]}
            numberOfLines={2}
          >
            {c.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SeverityPicker({ value, onChange, colors }: { value: number; onChange: (v: number) => void; colors: any }) {
  return (
    <View style={styles.severityRow}>
      {[1, 2, 3, 4].map((s) => {
        const cfg = SEVERITY_CONFIG[s]!;
        const active = value === s;
        return (
          <TouchableOpacity
            key={s}
            onPress={() => onChange(s)}
            style={[
              styles.severityBtn,
              {
                borderColor: active ? cfg.color : colors.border,
                backgroundColor: active ? cfg.bg : colors.secondary,
                borderRadius: 10,
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.severityBtnLabel, { color: active ? cfg.color : colors.mutedForeground }]}>
              {cfg.label}
            </Text>
            <Text style={[styles.severityBtnPts, { color: active ? cfg.color : colors.mutedForeground }]}>
              {cfg.points} pt{cfg.points !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function UserViolationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const qc = useQueryClient();
  const { userId, userName } = useLocalSearchParams<{ userId: string; userName: string }>();
  const uid = parseInt(userId ?? "0");

  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("harassment");
  const [severity, setSeverity] = useState(1);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const queryKey = ["adminUserViolations", uid];
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users/${uid}/violations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!uid,
  });

  const violations: any[] = data?.violations ?? [];
  const score: number = data?.score ?? 0;
  const level: string = data?.level ?? "clean";
  const rec = RECOMMENDATIONS[level] ?? RECOMMENDATIONS["clean"]!;
  const roundedScore = Math.round(score * 10) / 10;

  const handleLog = async () => {
    if (!description.trim()) {
      toast.error("Required", "Please describe the violation.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/violations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: uid, category, severity, description: description.trim(), notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Violation Logged", "The violation has been recorded.");
      setShowModal(false);
      setCategory("harassment");
      setSeverity(1);
      setDescription("");
      setNotes("");
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["adminAllViolations"] });
      qc.invalidateQueries({ queryKey: ["adminStats"] });
    } catch {
      toast.error("Error", "Could not log violation.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: "Remove Violation?",
      message: "This will permanently remove this violation record and update the user's risk score.",
      confirmLabel: "Remove",
      destructive: true,
      icon: "trash-2",
      onConfirm: async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/admin/violations/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error("Failed");
          toast.success("Removed", "Violation record removed.");
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["adminAllViolations"] });
        } catch {
          toast.error("Error", "Could not remove violation.");
        }
      },
    });
  };

  const handleApply = () => {
    if (level === "clean") return;
    const actionMap: Record<string, string> = {
      warning: "Send a formal warning notification",
      short_suspension: "Suspend user for 7 days",
      long_suspension: "Suspend user for 30 days",
      ban: "Permanently ban this user",
    };
    showConfirm({
      title: `Apply: ${rec.label}?`,
      message: actionMap[level] ?? "Apply recommended action?",
      confirmLabel: "Apply",
      destructive: level === "ban" || level === "long_suspension",
      icon: rec.icon,
      onConfirm: async () => {
        try {
          const res = await fetch(`${BASE_URL}/api/admin/violations/apply-recommendation`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: uid, level }),
          });
          if (!res.ok) throw new Error("Failed");
          toast.success("Action Applied", `${rec.label} has been applied to the user.`);
          qc.invalidateQueries({ queryKey });
          qc.invalidateQueries({ queryKey: ["adminAllViolations"] });
        } catch {
          toast.error("Error", "Could not apply recommendation.");
        }
      },
    });
  };

  const getCategoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  const getCategoryIcon = (cat: string): React.ComponentProps<typeof Feather>["name"] =>
    CATEGORIES.find((c) => c.value === cat)?.icon ?? "alert-octagon";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Violation Record</Text>
          {userName ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {userName}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={[styles.logBtn, { backgroundColor: "#ef444415", borderRadius: 10 }]}
        >
          <Feather name="plus" size={15} color="#ef4444" />
          <Text style={[styles.logBtnText, { color: "#ef4444" }]}>Log</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={violations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
          ListHeaderComponent={
            <>
              {/* Score card */}
              <View
                style={[
                  styles.scoreCard,
                  { backgroundColor: rec.bg, borderColor: rec.color + "40", borderRadius: colors.radius },
                ]}
              >
                <View style={styles.scoreLeft}>
                  <Text style={[styles.scoreNumber, { color: rec.color }]}>{roundedScore}</Text>
                  <Text style={[styles.scoreLabel, { color: rec.color }]}>Risk Score</Text>
                </View>
                <View style={[styles.scoreDivider, { backgroundColor: rec.color + "30" }]} />
                <View style={styles.scoreRight}>
                  <View style={[styles.recBadge, { backgroundColor: rec.color + "20", borderRadius: 8 }]}>
                    <Feather name={rec.icon} size={14} color={rec.color} />
                    <Text style={[styles.recBadgeText, { color: rec.color }]}>{rec.label}</Text>
                  </View>
                  <Text style={[styles.recDesc, { color: colors.mutedForeground }]}>
                    {SCORE_LABELS[level]}
                  </Text>
                  {level !== "clean" && (
                    <TouchableOpacity
                      onPress={handleApply}
                      style={[
                        styles.applyBtn,
                        { backgroundColor: rec.color, borderRadius: 8 },
                      ]}
                    >
                      <Text style={styles.applyBtnText}>Apply Recommendation</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* How score is calculated */}
              <View
                style={[
                  styles.howCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Text style={[styles.howTitle, { color: colors.foreground }]}>How the score is calculated</Text>
                <Text style={[styles.howBody, { color: colors.mutedForeground }]}>
                  Each violation contributes severity points × recency weight. Low = 1 pt · Medium = 3 pts · High = 6 pts · Critical = 10 pts. Violations from the last 30 days weigh 1.5×, last 90 days 1×, last 180 days 0.75×, and older violations 0.5×.
                </Text>
                <View style={styles.thresholdRow}>
                  {[
                    { range: "0", label: "Clean", color: "#10b981" },
                    { range: "1–4", label: "Warning", color: "#f59e0b" },
                    { range: "5–9", label: "7-day", color: "#f97316" },
                    { range: "10–19", label: "30-day", color: "#ef4444" },
                    { range: "20+", label: "Ban", color: "#7c3aed" },
                  ].map((t) => (
                    <View key={t.range} style={[styles.threshChip, { backgroundColor: t.color + "15", borderRadius: 6 }]}>
                      <Text style={[styles.threshRange, { color: t.color }]}>{t.range}</Text>
                      <Text style={[styles.threshLabel, { color: t.color }]}>{t.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                VIOLATION HISTORY {violations.length > 0 ? `· ${violations.length}` : ""}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="check-circle" size={32} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, marginTop: 8, fontSize: 14 }]}>No violations on record</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sev = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG[1]!;
            return (
              <View
                style={[
                  styles.violCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <View style={styles.violTop}>
                  <View style={[styles.violIconWrap, { backgroundColor: sev.bg, borderRadius: 10 }]}>
                    <Feather name={getCategoryIcon(item.category)} size={16} color={sev.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.violCategory, { color: colors.foreground }]}>
                      {getCategoryLabel(item.category)}
                    </Text>
                    <Text style={[styles.violDate, { color: colors.mutedForeground }]}>
                      {new Date(item.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                      {" · "}by {item.admin_name ?? "Admin"}
                    </Text>
                  </View>
                  <View style={[styles.sevBadge, { backgroundColor: sev.bg, borderRadius: 6 }]}>
                    <Text style={[styles.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={[styles.delBtn, { backgroundColor: "#ef444410", borderRadius: 6 }]}
                  >
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.violDesc, { color: colors.foreground }]}>{item.description}</Text>
                {item.notes ? (
                  <View style={[styles.violNotes, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
                    <Text style={[styles.violNotesLabel, { color: colors.mutedForeground }]}>Admin Note</Text>
                    <Text style={[styles.violNotesText, { color: colors.mutedForeground }]}>{item.notes}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}

      {/* Log Violation Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalDismiss} onPress={() => setShowModal(false)} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log Violation</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Category</Text>
              <CategoryPicker value={category} onChange={setCategory} colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 16 }]}>Severity</Text>
              <SeverityPicker value={severity} onChange={setSeverity} colors={colors} />

              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 16 }]}>Description *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderRadius: colors.radius,
                  },
                ]}
                placeholder="Describe the violation in detail..."
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 16 }]}>Admin Notes (optional)</Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderRadius: colors.radius,
                  },
                ]}
                placeholder="Internal notes (not shown to user)..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                onPress={handleLog}
                disabled={saving}
                style={[styles.submitBtn, { backgroundColor: "#ef4444", borderRadius: colors.radius, marginTop: 20, marginBottom: 8 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="plus-circle" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Log Violation</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 1 },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  logBtnText: { fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 10 },

  scoreCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    padding: 16,
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  scoreLeft: { alignItems: "center", minWidth: 64 },
  scoreNumber: { fontSize: 40, fontWeight: "800", lineHeight: 44 },
  scoreLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  scoreDivider: { width: 1, alignSelf: "stretch" },
  scoreRight: { flex: 1, gap: 8 },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  recBadgeText: { fontSize: 13, fontWeight: "700" },
  recDesc: { fontSize: 12, lineHeight: 18 },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  applyBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  howCard: { padding: 14, borderWidth: 1, gap: 8 },
  howTitle: { fontSize: 13, fontWeight: "700" },
  howBody: { fontSize: 12, lineHeight: 18 },
  thresholdRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  threshChip: { paddingHorizontal: 8, paddingVertical: 5, alignItems: "center" },
  threshRange: { fontSize: 11, fontWeight: "700" },
  threshLabel: { fontSize: 10, fontWeight: "500" },

  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 4 },

  emptyCard: {
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },

  violCard: { borderWidth: 1, padding: 14, gap: 8 },
  violTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  violIconWrap: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  violCategory: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  violDate: { fontSize: 12, marginTop: 1 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  sevBadgeText: { fontSize: 11, fontWeight: "700" },
  delBtn: { padding: 8 },
  violDesc: { fontSize: 13, lineHeight: 20 },
  violNotes: { padding: 10, gap: 2 },
  violNotesLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  violNotesText: { fontSize: 12, lineHeight: 18 },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#94a3b8", alignSelf: "center", marginBottom: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8 },

  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerItem: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderWidth: 1.5, width: "48%" },
  pickerItemText: { fontSize: 12, fontWeight: "500", flex: 1 },

  severityRow: { flexDirection: "row", gap: 8 },
  severityBtn: { flex: 1, alignItems: "center", padding: 10, borderWidth: 1.5 },
  severityBtnLabel: { fontSize: 12, fontWeight: "700" },
  severityBtnPts: { fontSize: 10, marginTop: 2 },

  textArea: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
