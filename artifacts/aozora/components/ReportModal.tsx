import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const REASONS = [
  { key: "Scam or Fraud", icon: "alert-triangle" as const },
  { key: "Harassment", icon: "slash" as const },
  { key: "Threats or Violence", icon: "zap" as const },
  { key: "Fake Listing or Profile", icon: "user-x" as const },
  { key: "Unethical Behavior", icon: "thumbs-down" as const },
  { key: "Spam", icon: "mail" as const },
  { key: "Inappropriate Content", icon: "eye-off" as const },
  { key: "Other", icon: "more-horizontal" as const },
];

const TARGET_LABELS: Record<string, string> = {
  user: "User",
  dorm: "Listing",
  review: "Review",
};

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: "user" | "dorm" | "review";
  targetId: number;
  targetLabel?: string;
  token?: string | null;
  colors: any;
}

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  targetLabel,
  token,
  colors,
}: ReportModalProps) {
  const insets = useSafeAreaInsets();
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const typeLabel = TARGET_LABELS[targetType] ?? "Content";
  const displayLabel = targetLabel ? `"${targetLabel}"` : `this ${typeLabel.toLowerCase()}`;

  const reset = () => {
    setSelectedReason(null);
    setDetails("");
    setSubmitted(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason || !token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Could not submit report.");
      }

      setSubmitted(true);
    } catch (e: any) {
      toast.error("Could not submit", e.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {submitted ? (
            /* Success state */
            <View style={styles.successWrap}>
              <View style={[styles.successIcon, { backgroundColor: "#10b98118" }]}>
                <Feather name="check-circle" size={36} color="#10b981" />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>
                Report submitted
              </Text>
              <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
                Thank you for helping keep Aozora safe. Our team will review this report confidentially.
              </Text>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                onPress={handleClose}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={[styles.shieldIcon, { backgroundColor: "#ef444418" }]}>
                  <Feather name="flag" size={20} color="#ef4444" />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: colors.foreground }]}>
                    Report {typeLabel}
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Reporting {displayLabel}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {/* Confidentiality note */}
              <View style={[styles.confidenceNote, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.confidenceText, { color: colors.mutedForeground }]}>
                  Your report is completely confidential. Only our moderation team will see it.
                </Text>
              </View>

              {/* Reason selection */}
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                What's the issue?
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.reasonScroll}
                contentContainerStyle={styles.reasonGrid}
              >
                {REASONS.map((r) => {
                  const isSelected = selectedReason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[
                        styles.reasonChip,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary + "14" : colors.background,
                        },
                      ]}
                      onPress={() => setSelectedReason(r.key)}
                      activeOpacity={0.75}
                    >
                      <Feather
                        name={r.icon}
                        size={14}
                        color={isSelected ? colors.primary : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.reasonText,
                          { color: isSelected ? colors.primary : colors.foreground },
                        ]}
                      >
                        {r.key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Optional details */}
              <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 12 }]}>
                Additional context{" "}
                <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>(optional)</Text>
              </Text>
              <TextInput
                style={[
                  styles.detailsInput,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Describe what happened..."
                placeholderTextColor={colors.mutedForeground}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
              />

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: selectedReason ? "#ef4444" : colors.muted },
                ]}
                disabled={!selectedReason || isSubmitting}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="flag" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shieldIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  confidenceText: { fontSize: 13, flex: 1, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: "600" },
  reasonScroll: { maxHeight: 180 },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  reasonText: { fontSize: 13, fontWeight: "500" },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    lineHeight: 20,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  successWrap: { alignItems: "center", paddingVertical: 12, gap: 12 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 20, fontWeight: "700" },
  successBody: { fontSize: 14, textAlign: "center", lineHeight: 21, paddingHorizontal: 8 },
  doneBtn: {
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 4,
  },
  doneBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
