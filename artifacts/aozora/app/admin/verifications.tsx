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

const REJECTION_REASONS = [
  { id: "photo_unclear",  label: "Document unclear or unreadable" },
  { id: "name_mismatch",  label: "Name on ID does not match account profile" },
  { id: "expired_id",     label: "ID document is expired" },
  { id: "face_mismatch",  label: "Face on ID does not match the account holder" },
  { id: "wrong_type",     label: "ID type does not match what was declared" },
  { id: "incomplete",     label: "Document is incomplete or partially visible" },
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
  const [reviewModal, setReviewModal] = useState<{
    item: any;
    status: "approved" | "rejected";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [rejectionChecked, setRejectionChecked] = useState<Set<string>>(new Set());
  const [rejectionNote, setRejectionNote] = useState("");

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

  const openReviewModal = (item: any, status: "approved" | "rejected") => {
    setReviewNote("");
    setCheckedItems(new Set());
    setRejectionChecked(new Set());
    setRejectionNote("");
    setReviewModal({ item, status });
  };

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRejectionReason = (id: string) => {
    setRejectionChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = checkedItems.size === APPROVAL_CHECKLIST.length;

  const submitReview = () => {
    if (!reviewModal) return;
    const { item, status } = reviewModal;
    if (status === "rejected" && rejectionChecked.size === 0) {
      toast.warning("Select a reason", "Please select at least one reason for rejection.");
      return;
    }
    if (status === "approved" && !allChecked) {
      toast.warning("Checklist incomplete", "Please complete all verification checks before approving.");
      return;
    }
    let builtNote = reviewNote.trim();
    if (status === "rejected") {
      const reasons = REJECTION_REASONS
        .filter((r) => rejectionChecked.has(r.id))
        .map((r) => r.label)
        .join("\n");
      builtNote = reasons + (rejectionNote.trim() ? "\n" + rejectionNote.trim() : "");
    }
    review.mutate(
      { verificationId: item.id, data: { status, reviewNote: builtNote || undefined } },
      { onSuccess: () => setReviewModal(null) }
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

              {item.idImageUrl && (
                <TouchableOpacity
                  onPress={() => setPreviewImage(item.idImageUrl)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.idImageUrl }}
                    style={[styles.idThumbnail, { borderColor: colors.border, borderRadius: 8 }]}
                    resizeMode="cover"
                  />
                  <View style={[styles.viewIdOverlay, { borderRadius: 8 }]}>
                    <Feather name="zoom-in" size={18} color="#fff" />
                    <Text style={styles.viewIdOverlayText}>Tap to view full image</Text>
                  </View>
                </TouchableOpacity>
              )}

              {item.reviewNote && (
                <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Note</Text>
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{item.reviewNote}</Text>
                </View>
              )}

              {item.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: "#10b981", borderRadius: 8 }]}
                    onPress={() => openReviewModal(item, "approved")}
                    disabled={review.isPending}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { backgroundColor: "#ef4444", borderRadius: 8 }]}
                    onPress={() => openReviewModal(item, "rejected")}
                    disabled={review.isPending}
                  >
                    <Feather name="x-circle" size={16} color="#fff" />
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
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

      {/* Review note modal */}
      <Modal
        visible={!!reviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModal(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.reviewModalBackdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReviewModal(null)} />
          <View style={[styles.reviewModalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.reviewModalHeader, { borderBottomColor: colors.border }]}>
              <View style={[
                styles.reviewModalIconWrap,
                { backgroundColor: reviewModal?.status === "approved" ? "#10b98122" : "#ef444422" },
              ]}>
                {reviewModal?.status === "approved"
                  ? <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                  : <Feather name="x-circle" size={22} color="#ef4444" />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewModalTitle, { color: colors.foreground }]}>
                  {reviewModal?.status === "approved" ? "Approve ID" : "Reject ID"}
                </Text>
                <Text style={[styles.reviewModalSub, { color: colors.mutedForeground }]}>
                  {reviewModal?.item?.user?.fullName ?? "User"}
                  {" · "}
                  {reviewModal?.item?.idType}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModal(null)} style={styles.reviewModalCloseBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
              {/* Applicant Info Panel */}
              {reviewModal?.item?.user && (
                <View style={[styles.applicantPanel, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                  <View style={styles.reviewSectionLabel}>
                    <Feather name="user" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.reviewImageLabel, { color: colors.mutedForeground }]}>Applicant Information</Text>
                  </View>
                  <View style={styles.applicantRows}>
                    <View style={styles.applicantRow}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Full Name</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>{reviewModal.item.user.fullName || "—"}</Text>
                    </View>
                    {(reviewModal.item.user.email || reviewModal.item.user.phone) && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Contact</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                          {reviewModal.item.user.email || reviewModal.item.user.phone}
                        </Text>
                      </View>
                    )}
                    {reviewModal.item.user.birthday && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Birthday</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                          {new Date(reviewModal.item.user.birthday).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                        </Text>
                      </View>
                    )}
                    {reviewModal.item.user.universityOrWorkplace && (
                      <View style={styles.applicantRow}>
                        <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>School / Work</Text>
                        <Text style={[styles.applicantVal, { color: colors.foreground }]}>{reviewModal.item.user.universityOrWorkplace}</Text>
                      </View>
                    )}
                    <View style={styles.applicantRow}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>ID Type</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>{reviewModal.item.idType}</Text>
                    </View>
                    <View style={[styles.applicantRow, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.applicantKey, { color: colors.mutedForeground }]}>Submitted</Text>
                      <Text style={[styles.applicantVal, { color: colors.foreground }]}>
                        {reviewModal.item.submittedAt
                          ? new Date(reviewModal.item.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                          : "—"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ID Image */}
              {reviewModal?.item?.idImageUrl && (
                <View style={styles.reviewImageSection}>
                  <View style={styles.reviewSectionLabel}>
                    <Feather name="image" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.reviewImageLabel, { color: colors.mutedForeground }]}>
                      Submitted ID Document
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPreviewImage(reviewModal.item.idImageUrl)}
                    activeOpacity={0.88}
                    style={styles.reviewImageWrap}
                  >
                    <Image
                      source={{ uri: reviewModal.item.idImageUrl }}
                      style={[styles.reviewImage, { borderColor: colors.border }]}
                      resizeMode="cover"
                    />
                    <View style={styles.reviewImageOverlay}>
                      <Feather name="zoom-in" size={16} color="#fff" />
                      <Text style={styles.reviewImageOverlayText}>Tap to enlarge</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Approval checklist */}
              {reviewModal?.status === "approved" && (
                <View style={styles.checklistSection}>
                  <View style={styles.checklistHeader}>
                    <Feather name="clipboard" size={15} color={colors.foreground} />
                    <Text style={[styles.checklistTitle, { color: colors.foreground }]}>
                      Verification Checklist
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
                    Tick every item to enable approval.
                  </Text>
                  {APPROVAL_CHECKLIST.map((item) => {
                    const checked = checkedItems.has(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.checklistRow,
                          {
                            borderColor: checked ? "#10b981" : colors.border,
                            backgroundColor: checked ? "#10b98110" : colors.background,
                            borderRadius: colors.radius,
                          },
                        ]}
                        onPress={() => toggleCheck(item.id)}
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
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {!allChecked && (
                    <View style={styles.checklistWarning}>
                      <Feather name="alert-circle" size={13} color="#f59e0b" />
                      <Text style={styles.checklistWarningText}>
                        Complete all checks before approving.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Rejection reasons checklist */}
              {reviewModal?.status === "rejected" && (
                <View style={styles.checklistSection}>
                  <View style={styles.checklistHeader}>
                    <Feather name="x-circle" size={15} color="#ef4444" />
                    <Text style={[styles.checklistTitle, { color: colors.foreground }]}>
                      Reason(s) for Rejection
                    </Text>
                    <View style={[
                      styles.checklistBadge,
                      { backgroundColor: rejectionChecked.size > 0 ? "#ef444422" : colors.muted },
                    ]}>
                      <Text style={[
                        styles.checklistBadgeText,
                        { color: rejectionChecked.size > 0 ? "#ef4444" : colors.mutedForeground },
                      ]}>
                        {rejectionChecked.size} selected
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.checklistSub, { color: colors.mutedForeground }]}>
                    Select all that apply — these will be included in the email to the applicant.
                  </Text>
                  {REJECTION_REASONS.map((reason) => {
                    const checked = rejectionChecked.has(reason.id);
                    return (
                      <TouchableOpacity
                        key={reason.id}
                        style={[
                          styles.checklistRow,
                          {
                            borderColor: checked ? "#ef4444" : colors.border,
                            backgroundColor: checked ? "#ef444410" : colors.background,
                            borderRadius: colors.radius,
                          },
                        ]}
                        onPress={() => toggleRejectionReason(reason.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.checkbox,
                          {
                            borderColor: checked ? "#ef4444" : colors.border,
                            backgroundColor: checked ? "#ef4444" : "transparent",
                          },
                        ]}>
                          {checked && <Feather name="check" size={11} color="#fff" />}
                        </View>
                        <Text style={[
                          styles.checklistLabel,
                          { color: checked ? colors.foreground : colors.mutedForeground },
                        ]}>
                          {reason.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {rejectionChecked.size === 0 && (
                    <View style={styles.checklistWarning}>
                      <Feather name="alert-circle" size={13} color="#f59e0b" />
                      <Text style={styles.checklistWarningText}>
                        Select at least one reason before rejecting.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Additional notes / approval note */}
              <View style={styles.reviewModalBody}>
                <Text style={[styles.reviewNoteLabel, { color: colors.foreground }]}>
                  {reviewModal?.status === "rejected" ? "Additional notes" : "Note for user"}
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
                  placeholder={
                    reviewModal?.status === "rejected"
                      ? "Optional — any extra detail for the applicant."
                      : "Optional — any notes for this user."
                  }
                  placeholderTextColor={colors.mutedForeground}
                  value={reviewModal?.status === "rejected" ? rejectionNote : reviewNote}
                  onChangeText={reviewModal?.status === "rejected" ? setRejectionNote : setReviewNote}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={[styles.reviewModalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.reviewCancelBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => setReviewModal(null)}
              >
                <Text style={[styles.reviewCancelText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reviewConfirmBtn,
                  {
                    backgroundColor: reviewModal?.status === "approved" ? "#10b981" : "#ef4444",
                    borderRadius: colors.radius,
                    opacity: (review.isPending || (reviewModal?.status === "approved" && !allChecked) || (reviewModal?.status === "rejected" && rejectionChecked.size === 0)) ? 0.4 : 1,
                  },
                ]}
                onPress={submitReview}
                disabled={review.isPending || (reviewModal?.status === "approved" && !allChecked) || (reviewModal?.status === "rejected" && rejectionChecked.size === 0)}
              >
                {review.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      {reviewModal?.status === "approved"
                        ? <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        : <Feather name="x-circle" size={16} color="#fff" />
                      }
                      <Text style={styles.reviewConfirmText}>
                        {reviewModal?.status === "approved" ? "Approve" : "Reject"}
                      </Text>
                    </>
                }
              </TouchableOpacity>
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
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 18, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
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
  idThumbnail: { width: "100%", height: 160, borderWidth: 1 },
  viewIdOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  viewIdOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
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
  noteBox: { padding: 10, gap: 2 },
  noteLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  noteText: { fontSize: 13 },
  applicantPanel: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1 },
  applicantRows: { gap: 0 },
  applicantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(150,150,150,0.15)" },
  applicantKey: { fontSize: 12, fontWeight: "600", width: 100, paddingTop: 1 },
  applicantVal: { fontSize: 13, flex: 1, textAlign: "right" },
  reviewSectionLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  reviewImageSection: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  reviewImageLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewImageLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  reviewImageWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  reviewImage: { width: "100%", height: 200, borderWidth: 1, borderRadius: 10 },
  reviewImageOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  reviewImageOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
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
  reviewModalCloseBtn: { padding: 6 },
  reviewModalBody: { padding: 16, gap: 8 },
  reviewNoteLabel: { fontSize: 14, fontWeight: "600" },
  reviewNoteInput: {
    borderWidth: 1, padding: 12, fontSize: 14,
    minHeight: 90, textAlignVertical: "top",
  },
  reviewNoteHint: { fontSize: 12 },
  reviewModalFooter: {
    flexDirection: "row", gap: 10,
    padding: 16, paddingBottom: 32, borderTopWidth: 1,
  },
  reviewCancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingVertical: 14,
  },
  reviewCancelText: { fontSize: 15, fontWeight: "600" },
  reviewConfirmBtn: {
    flex: 2, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, paddingVertical: 14,
  },
  reviewConfirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { paddingVertical: 60, alignItems: "center", gap: 12 },

  checklistSection: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  checklistHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  checklistTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  checklistBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20,
  },
  checklistBadgeText: { fontSize: 12, fontWeight: "700" },
  checklistSub: { fontSize: 12, marginBottom: 4 },
  checklistRow: {
    flexDirection: "row", alignItems: "center",
    gap: 10, padding: 12, borderWidth: 1,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  checklistLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  checklistWarning: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f59e0b18", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    marginTop: 2,
  },
  checklistWarningText: { fontSize: 12, color: "#f59e0b", flex: 1 },
});
