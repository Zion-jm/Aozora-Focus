import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import {
  getAdminGetVerificationsQueryKey,
  useAdminGetVerifications,
  useAdminReviewVerification,
} from "@workspace/api-client-react";

const APPROVAL_CHECKLIST = [
  { id: "photo_clear",   label: "ID photo is clear and fully legible" },
  { id: "name_match",    label: "Name on ID matches submitted full name" },
  { id: "not_expired",   label: "ID is valid and not expired" },
  { id: "face_match",    label: "Face on ID matches the account holder" },
  { id: "type_match",    label: "ID type matches what was declared" },
  { id: "age_confirmed", label: "Birthday on ID confirms user is 18 or older" },
];

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const FILTERS = ["all", "pending", "approved", "rejected"];

export default function AdminVerificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [evaluateModal, setEvaluateModal] = useState<{ item: any } | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [additionalNote, setAdditionalNote] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetVerifications({
    query: { queryKey: getAdminGetVerificationsQueryKey(), refetchInterval: 8_000 },
  });

  const all = (data as any)?.verifications || [];
  const items = useMemo(() => {
    const byStatus = all.filter((v: any) => filter === "all" || v.status === filter);
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter(
      (v: any) =>
        v.user?.fullName?.toLowerCase().includes(q) ||
        v.user?.email?.toLowerCase().includes(q) ||
        v.user?.phone?.toLowerCase().includes(q) ||
        v.idType?.toLowerCase().includes(q)
    );
  }, [all, filter, search]);

  const review = useAdminReviewVerification({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminGetVerificationsQueryKey() }),
      onError: () => toast.error("Error", "Could not update verification."),
    },
  });

  const openEvaluateModal = (item: any) => {
    setCheckedItems(new Set());
    setAdditionalNote("");
    setEvaluateModal({ item });
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = checkedItems.size === APPROVAL_CHECKLIST.length;

  const uncheckedItems = APPROVAL_CHECKLIST.filter((item) => !checkedItems.has(item.id));

  const submitDecision = (decision: "approved" | "rejected") => {
    if (!evaluateModal) return;
    const { item } = evaluateModal;

    let reviewNote: string | undefined;
    if (decision === "rejected") {
      const reasons = uncheckedItems.map((r) => r.label).join("\n");
      reviewNote = reasons + (additionalNote.trim() ? "\n" + additionalNote.trim() : "");
    } else {
      reviewNote = additionalNote.trim() || undefined;
    }

    review.mutate(
      { verificationId: item.id, data: { status: decision, reviewNote } },
      { onSuccess: () => setEvaluateModal(null) }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="ID Verifications" subtitle="Review submitted identity documents" />

      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, email, or ID type…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { borderRadius: 20 }, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {STATUS_LABEL[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load verifications</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <TouchableOpacity
                style={styles.cardTop}
                onPress={() => item.user?.id && router.push({ pathname: "/admin/user-detail", params: { userId: item.user.id.toString() } })}
                activeOpacity={0.75}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(item.user?.fullName || "U")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{item.user?.fullName || "—"}</Text>
                  <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{item.user?.email || item.user?.phone || ""}</Text>
                  <Text style={[styles.idType, { color: colors.mutedForeground }]}>ID: {item.idType}</Text>
                </View>
                <View style={styles.cardTopRight}>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || "#64748b") + "22" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || "#64748b" }]}>
                      {STATUS_LABEL[item.status] || item.status}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>

              {item.submittedAt && (
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                </Text>
              )}

              {/* ID thumbnails */}
              <View style={styles.idThumbnailRow}>
                {item.idImageUrl && (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setPreviewImage(item.idImageUrl)} activeOpacity={0.85}>
                    <Image source={{ uri: item.idImageUrl }} style={[styles.idThumbnail, { borderColor: colors.border }]} resizeMode="cover" />
                    <View style={styles.idThumbOverlay}>
                      <Text style={styles.idThumbLabel}>FRONT</Text>
                      <Feather name="zoom-in" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
                {item.idBackImageUrl && (
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => setPreviewImage(item.idBackImageUrl)} activeOpacity={0.85}>
                    <Image source={{ uri: item.idBackImageUrl }} style={[styles.idThumbnail, { borderColor: colors.border }]} resizeMode="cover" />
                    <View style={styles.idThumbOverlay}>
                      <Text style={styles.idThumbLabel}>BACK</Text>
                      <Feather name="zoom-in" size={13} color="#fff" />
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {item.reviewNote && (
                <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Note</Text>
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{item.reviewNote}</Text>
                </View>
              )}

              {item.status === "pending" && (
                <TouchableOpacity
                  style={[styles.evaluateBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}
                  onPress={() => openEvaluateModal(item)}
                  disabled={review.isPending}
                >
                  <Feather name="clipboard" size={16} color="#fff" />
                  <Text style={styles.evaluateBtnText}>Evaluate</Text>
                </TouchableOpacity>
              )}

              {item.status !== "pending" && item.reviewedAt && (
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shield" size={48} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontSize: 16 }]}>
                No {STATUS_LABEL[filter]?.toLowerCase()} verifications
              </Text>
            </View>
          }
        />
      )}

      {/* Evaluate modal */}
      <Modal
        visible={!!evaluateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEvaluateModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.reviewModalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEvaluateModal(null)} />
          <View style={[styles.reviewModalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* Header */}
            <View style={[styles.reviewModalHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.reviewModalIconWrap, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="clipboard" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewModalTitle, { color: colors.foreground }]}>Evaluate ID</Text>
                <Text style={[styles.reviewModalSub, { color: colors.mutedForeground }]}>
                  {evaluateModal?.item?.user?.fullName ?? "User"} · {evaluateModal?.item?.idType}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEvaluateModal(null)} style={styles.reviewModalCloseBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 560 }} keyboardShouldPersistTaps="handled">

              {/* Applicant info */}
              {evaluateModal?.item?.user && (
                <View style={[styles.applicantPanel, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                  <View style={styles.reviewSectionLabel}>
                    <Feather name="user" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.reviewImageLabel, { color: colors.mutedForeground }]}>Applicant Information</Text>
                  </View>
                  <View style={styles.applicantRows}>
                    <View style={styles.applicantRow}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Full Name</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>{evaluateModal.item.user.fullName || "—"}</Text>
                    </View>
                    {(evaluateModal.item.user.email || evaluateModal.item.user.phone) && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Contact</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                          {evaluateModal.item.user.email || evaluateModal.item.user.phone}
                        </Text>
                      </View>
                    )}
                    {evaluateModal.item.user.birthday && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Birthday</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                          {new Date(evaluateModal.item.user.birthday).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        </Text>
                      </View>
                    )}
                    {evaluateModal.item.user.universityOrWorkplace && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>School / Work</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>{evaluateModal.item.user.universityOrWorkplace}</Text>
                      </View>
                    )}
                    <View style={styles.applicantRow}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>ID Type</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>{evaluateModal.item.idType}</Text>
                    </View>
                    <View style={[styles.applicantRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Submitted</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                        {evaluateModal.item.submittedAt
                          ? new Date(evaluateModal.item.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ID images — front and back */}
              {(evaluateModal?.item?.idImageUrl || evaluateModal?.item?.idBackImageUrl) && (
                <View style={styles.reviewImageSection}>
                  <View style={styles.reviewSectionLabel}>
                    <Feather name="image" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.reviewImageLabel, { color: colors.mutedForeground }]}>
                      Submitted ID Document
                    </Text>
                  </View>
                  <View style={styles.reviewImageRow}>
                    {evaluateModal?.item?.idImageUrl && (
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.idSideTag, { color: colors.mutedForeground }]}>FRONT</Text>
                        <TouchableOpacity
                          onPress={() => setPreviewImage(evaluateModal!.item.idImageUrl)}
                          activeOpacity={0.88}
                          style={styles.reviewImageWrap}
                        >
                          <Image
                            source={{ uri: evaluateModal.item.idImageUrl }}
                            style={[styles.reviewImage, { borderColor: colors.border }]}
                            resizeMode="cover"
                          />
                          <View style={styles.reviewImageOverlay}>
                            <Feather name="zoom-in" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                    {evaluateModal?.item?.idBackImageUrl && (
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.idSideTag, { color: colors.mutedForeground }]}>BACK</Text>
                        <TouchableOpacity
                          onPress={() => setPreviewImage(evaluateModal!.item.idBackImageUrl)}
                          activeOpacity={0.88}
                          style={styles.reviewImageWrap}
                        >
                          <Image
                            source={{ uri: evaluateModal.item.idBackImageUrl }}
                            style={[styles.reviewImage, { borderColor: colors.border }]}
                            resizeMode="cover"
                          />
                          <View style={styles.reviewImageOverlay}>
                            <Feather name="zoom-in" size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Evaluation checklist */}
              <View style={styles.checklistSection}>
                <View style={styles.checklistHeader}>
                  <Feather name="check-square" size={15} color={colors.foreground} />
                  <Text style={[styles.checklistTitle, { color: colors.foreground }]}>
                    Evaluation Checklist
                  </Text>
                  <View style={[
                    styles.checklistBadge,
                    { backgroundColor: allChecked ? "#10b98122" : colors.muted },
                  ]}>
                    <Text style={[
                      styles.checklistBadgeText,
                      { color: allChecked ? "#10b981" : colors.mutedForeground },
                    ]}>
                      {checkedItems.size}/{APPROVAL_CHECKLIST.length}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.checklistSub, { color: colors.mutedForeground }]}>
                  Check each criterion that the submission satisfies. All checked = Approve; any unchecked = Reject with those reasons.
                </Text>
                {APPROVAL_CHECKLIST.map((chk) => {
                  const checked = checkedItems.has(chk.id);
                  return (
                    <TouchableOpacity
                      key={chk.id}
                      style={[
                        styles.checklistRow,
                        {
                          borderColor: checked ? "#10b981" : colors.border,
                          backgroundColor: checked ? "#10b98110" : colors.background,
                          borderRadius: colors.radius,
                        },
                      ]}
                      onPress={() => toggleCheck(chk.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        {
                          borderColor: checked ? "#10b981" : colors.border,
                          backgroundColor: checked ? "#10b981" : "transparent",
                        },
                      ]}>
                        {checked && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[
                        styles.checklistLabel,
                        { color: checked ? colors.foreground : colors.mutedForeground },
                      ]}>
                        {chk.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Outcome preview */}
                {checkedItems.size > 0 && (
                  <View style={[
                    styles.outcomePreview,
                    { backgroundColor: allChecked ? "#10b98112" : "#ef444412", borderRadius: colors.radius },
                  ]}>
                    {allChecked ? (
                      <>
                        <Ionicons name="checkmark-circle" size={15} color="#10b981" />
                        <Text style={{ color: "#10b981", fontSize: 13, fontWeight: "600" }}>
                          All criteria met — this will be approved.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Feather name="x-circle" size={15} color="#ef4444" />
                        <Text style={{ color: "#ef4444", fontSize: 13, fontWeight: "600" }}>
                          {uncheckedItems.length} unmet — this will be rejected.
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Additional notes */}
              <View style={styles.reviewModalBody}>
                <Text style={[styles.reviewNoteLabel, { color: colors.foreground }]}>
                  Additional notes <Text style={[{ color: colors.mutedForeground, fontWeight: "400", fontSize: 12 }]}>(optional)</Text>
                </Text>
                <TextInput
                  style={[
                    styles.reviewNoteInput,
                    {
                      borderColor: colors.border,
                      color: colors.foreground,
                      backgroundColor: colors.background,
                      borderRadius: colors.radius,
                    },
                  ]}
                  placeholder="Any extra context for the applicant."
                  placeholderTextColor={colors.mutedForeground}
                  value={additionalNote}
                  onChangeText={setAdditionalNote}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Action footer */}
            <View style={[styles.reviewModalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.reviewCancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => setEvaluateModal(null)}
              >
                <Text style={[styles.reviewCancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>

              {checkedItems.size === 0 ? (
                <View style={[styles.reviewConfirmBtn, { backgroundColor: colors.muted, borderRadius: colors.radius, opacity: 0.5 }]}>
                  <Text style={[styles.reviewConfirmText, { color: colors.mutedForeground }]}>Evaluate first</Text>
                </View>
              ) : allChecked ? (
                <TouchableOpacity
                  style={[styles.reviewConfirmBtn, { backgroundColor: "#10b981", borderRadius: colors.radius }]}
                  onPress={() => submitDecision("approved")}
                  disabled={review.isPending}
                >
                  {review.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.reviewConfirmText}>Approve</Text>
                      </>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.reviewConfirmBtn, { backgroundColor: "#ef4444", borderRadius: colors.radius }]}
                  onPress={() => submitDecision("rejected")}
                  disabled={review.isPending}
                >
                  {review.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <>
                        <Feather name="x-circle" size={16} color="#fff" />
                        <Text style={styles.reviewConfirmText}>Reject</Text>
                      </>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image preview modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewImage(null)}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setPreviewImage(null)}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
            <Text style={styles.modalHint}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 14 },
  card: { borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600" },
  userEmail: { fontSize: 13 },
  idType: { fontSize: 13 },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  dateText: { fontSize: 12 },
  idThumbnailRow: { flexDirection: "row", gap: 8 },
  idThumbnail: { width: "100%", height: 110, borderWidth: 1, borderRadius: 8 },
  idThumbOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  idThumbLabel: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  evaluateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  evaluateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  noteBox: { padding: 10, gap: 2 },
  noteLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  noteText: { fontSize: 13 },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center", justifyContent: "center",
  },
  modalContent: { width: "100%", alignItems: "center", padding: 16, gap: 12 },
  modalClose: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, padding: 8,
  },
  modalImage: { width: "100%", height: 420 },
  modalHint: { color: "rgba(255,255,255,0.5)", fontSize: 12 },

  applicantPanel: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  applicantRows: { gap: 0 },
  applicantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(150,150,150,0.15)" },
  applicantKey: { fontSize: 12, fontWeight: "600", width: 100, paddingTop: 1 },
  applicantVal: { fontSize: 13, flex: 1, textAlign: "right" },

  reviewSectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  reviewImageSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 4 },
  reviewImageRow: { flexDirection: "row", gap: 10 },
  idSideTag: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 4 },
  reviewImageLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewImageWrap: { position: "relative", borderRadius: 8, overflow: "hidden" },
  reviewImage: { width: "100%", height: 140, borderWidth: 1, borderRadius: 8 },
  reviewImageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  checklistSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 8 },
  checklistHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  checklistTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  checklistBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  checklistBadgeText: { fontSize: 12, fontWeight: "700" },
  checklistSub: { fontSize: 12, lineHeight: 17 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checklistLabel: { fontSize: 13, flex: 1 },
  outcomePreview: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10 },

  reviewModalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reviewModalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderWidth: 1, borderBottomWidth: 0,
    overflow: "hidden",
  },
  reviewModalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderBottomWidth: 1,
  },
  reviewModalIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  reviewModalTitle: { fontSize: 16, fontWeight: "700" },
  reviewModalSub: { fontSize: 13, marginTop: 1 },
  reviewModalCloseBtn: { padding: 4 },
  reviewModalBody: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  reviewNoteLabel: { fontSize: 13, fontWeight: "600" },
  reviewNoteInput: { borderWidth: 1, padding: 12, fontSize: 14, minHeight: 72, textAlignVertical: "top" },
  reviewModalFooter: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1,
  },
  reviewCancelBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  reviewCancelText: { fontSize: 15, fontWeight: "600" },
  reviewConfirmBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  reviewConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  empty: { paddingVertical: 60, alignItems: "center", gap: 12 },
});
