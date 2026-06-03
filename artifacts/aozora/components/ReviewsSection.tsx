import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import { UserAvatar } from "@/components/UserAvatar";
import { ReportModal } from "@/components/ReportModal";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function StarRow({
  rating,
  size = 14,
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          disabled={!interactive}
          onPress={() => onRate?.(n)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
        >
          <Feather
            name={n <= rating ? "star" : "star"}
            size={size}
            color={n <= rating ? "#f59e0b" : "#d1d5db"}
            style={n <= Math.round(rating) ? { opacity: 1 } : { opacity: 0.3 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function formatTimeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface ReviewsSectionProps {
  type: "dorm" | "user";
  targetId: number;
  token?: string | null;
  colors: any;
}

export function ReviewsSection({ type, targetId, token, colors }: ReviewsSectionProps) {
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const { user: currentUser } = useAuth();
  const { requireVerified } = useVerificationGate();
  const qc = useQueryClient();
  const reviewsKey = [type === "dorm" ? "dormReviews" : "userReviews", targetId];
  const canReviewKey = ["canReview", type, targetId];

  const [showModal, setShowModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null);

  const [editingReview, setEditingReview] = useState<any | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: reviewsKey,
    queryFn: async () => {
      const url =
        type === "dorm"
          ? `${BASE_URL}/api/dorms/${targetId}/reviews`
          : `${BASE_URL}/api/users/${targetId}/reviews`;
      const res = await fetch(url);
      return res.json();
    },
    enabled: !!targetId,
  });

  const { data: canReviewData } = useQuery({
    queryKey: canReviewKey,
    queryFn: async () => {
      const url =
        type === "dorm"
          ? `${BASE_URL}/api/dorms/${targetId}/reviews/can-review`
          : `${BASE_URL}/api/users/${targetId}/reviews/can-review`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!targetId,
  });

  const reviews: any[] = reviewsData?.reviews ?? [];
  const average: number | null = reviewsData?.average ?? null;
  const total: number = reviewsData?.total ?? 0;
  const canReview: boolean = canReviewData?.canReview ?? false;
  const canReviewReason: string | undefined = canReviewData?.reason;
  const requiresCompletedVisit: boolean = canReviewData?.requiresCompletedVisit ?? false;

  const visibleReviews = expanded ? reviews : reviews.slice(0, 3);

  const handleSubmit = async () => {
    if (selectedRating === 0) {
      toast.warning("Rating required", "Please select a star rating.");
      return;
    }
    if (!token) return;
    setIsSubmitting(true);
    try {
      const url =
        type === "dorm"
          ? `${BASE_URL}/api/dorms/${targetId}/reviews`
          : `${BASE_URL}/api/users/${targetId}/reviews`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: selectedRating, comment: comment.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit review");
      }
      qc.invalidateQueries({ queryKey: reviewsKey });
      qc.invalidateQueries({ queryKey: canReviewKey });
      setShowModal(false);
      setSelectedRating(0);
      setComment("");
      toast.success("Review submitted!", "Thank you for your feedback.");
    } catch (e: any) {
      toast.error("Error", e.message ?? "Could not submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (review: any) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment ?? "");
  };

  const handleEditSubmit = async () => {
    if (!editingReview || !token) return;
    if (editRating === 0) {
      toast.warning("Rating required", "Please select a star rating.");
      return;
    }
    setIsEditSubmitting(true);
    try {
      const url =
        type === "dorm"
          ? `${BASE_URL}/api/dorms/${targetId}/reviews/${editingReview.id}`
          : `${BASE_URL}/api/users/${targetId}/reviews/${editingReview.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: editRating, comment: editComment.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update review");
      }
      qc.invalidateQueries({ queryKey: reviewsKey });
      setEditingReview(null);
      toast.success("Review updated!", "Your review has been saved.");
    } catch (e: any) {
      toast.error("Error", e.message ?? "Could not update review.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = (review: any) => {
    showConfirm({
      title: "Delete Review",
      message: "Are you sure you want to delete your review? This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
      icon: "trash-2",
      onConfirm: async () => {
        try {
          const url =
            type === "dorm"
              ? `${BASE_URL}/api/dorms/${targetId}/reviews/${review.id}`
              : `${BASE_URL}/api/users/${targetId}/reviews/${review.id}`;
          const res = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to delete review");
          }
          qc.invalidateQueries({ queryKey: reviewsKey });
          qc.invalidateQueries({ queryKey: canReviewKey });
        } catch (e: any) {
          toast.error("Error", e.message ?? "Could not delete review.");
        }
      },
    });
  };

  if (isLoading) return null;

  const reviewLabel = type === "dorm" ? "Tenant Reviews" : "Student Reviews";
  const writeLabel = type === "dorm" ? "Review this Dorm" : "Review this Student";
  const editLabel = type === "dorm" ? "Edit Your Review" : "Edit Your Review";
  const placeholder =
    type === "dorm"
      ? "Share your experience living here..."
      : "How was this student as a tenant?";

  return (
    <View style={styles.root}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{reviewLabel}</Text>
          {average !== null && total > 0 && (
            <View style={styles.avgRow}>
              <Text style={[styles.avgNum, { color: "#f59e0b" }]}>{average.toFixed(1)}</Text>
              <StarRow rating={average} size={14} />
              <Text style={[styles.totalText, { color: colors.mutedForeground }]}>({total})</Text>
            </View>
          )}
        </View>
        {canReview && (
          <TouchableOpacity
            style={[styles.writeBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={14} color={colors.primary} />
            <Text style={[styles.writeBtnText, { color: colors.primary }]}>Write Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Locked gate banner hidden — logic preserved via canReview / requiresCompletedVisit */}

      {reviews.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
          <Feather name="message-square" size={28} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reviews yet</Text>
          {!canReview && !requiresCompletedVisit && canReviewReason && (
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{canReviewReason}</Text>
          )}
        </View>
      ) : (
        <>
          {visibleReviews.map((review) => {
            const isOwnReview = currentUser?.id === review.reviewer.id;
            return (
              <View
                key={review.id}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardTop}>
                  <UserAvatar
                    name={review.reviewer.fullName}
                    avatarUrl={review.reviewer.avatarUrl}
                    size={36}
                    color={colors.primary}
                    backgroundColor={colors.primary + "22"}
                    userId={review.reviewer.id}
                  />
                  <View style={styles.cardMeta}>
                    <TouchableOpacity onPress={() => review.reviewer.id === currentUser?.id ? router.push("/(tabs)/profile") : router.push(`/user/${review.reviewer.id}`)}>
                      <Text style={[styles.reviewerName, { color: colors.foreground }]} numberOfLines={1}>
                        {review.reviewer.fullName}
                        {isOwnReview && (
                          <Text style={[styles.youBadge, { color: colors.mutedForeground }]}> · You</Text>
                        )}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.starsDate}>
                      <StarRow rating={review.rating} size={13} />
                      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                        · {formatTimeAgo(review.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Own review: show edit + delete. Other's review: show report flag. */}
                  {isOwnReview ? (
                    <View style={styles.ownActions}>
                      <TouchableOpacity
                        onPress={() => openEdit(review)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.actionBtn}
                      >
                        <Feather name="edit-2" size={13} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(review)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.actionBtn}
                      >
                        <Feather name="trash-2" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    token && currentUser?.role !== "admin" && (
                      <TouchableOpacity
                        onPress={() => requireVerified(() => setReportingReviewId(review.id))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.reviewFlagBtn}
                      >
                        <Feather name="flag" size={13} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    )
                  )}
                </View>
                {review.comment ? (
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{review.comment}</Text>
                ) : null}
              </View>
            );
          })}

          <ReportModal
            visible={reportingReviewId !== null}
            onClose={() => setReportingReviewId(null)}
            targetType="review"
            targetId={reportingReviewId ?? 0}
            targetLabel="this review"
            token={token}
            colors={colors}
          />

          {reviews.length > 3 && (
            <TouchableOpacity
              style={[styles.showMoreBtn, { borderColor: colors.border }]}
              onPress={() => setExpanded((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.showMoreText, { color: colors.primary }]}>
                {expanded ? "Show less" : `Show all ${total} reviews`}
              </Text>
              <Feather name={expanded ? "chevron-up" : "chevron-down"} size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Write Review Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{writeLabel}</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Your rating *</Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setSelectedRating(n)} activeOpacity={0.7}>
                  <Feather
                    name="star"
                    size={36}
                    color={n <= selectedRating ? "#f59e0b" : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {selectedRating > 0 && (
              <Text style={[styles.ratingLabel, { color: "#f59e0b" }]}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][selectedRating]}
              </Text>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Comment (optional)</Text>
            <TextInput
              style={[styles.commentInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowModal(false); setSelectedRating(0); setComment(""); }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  (selectedRating === 0 || isSubmitting) && { opacity: 0.5 },
                ]}
                disabled={selectedRating === 0 || isSubmitting}
                onPress={handleSubmit}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Review Modal */}
      <Modal visible={editingReview !== null} transparent animationType="slide" onRequestClose={() => setEditingReview(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{editLabel}</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Your rating *</Text>
            <View style={styles.starPicker}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setEditRating(n)} activeOpacity={0.7}>
                  <Feather
                    name="star"
                    size={36}
                    color={n <= editRating ? "#f59e0b" : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {editRating > 0 && (
              <Text style={[styles.ratingLabel, { color: "#f59e0b" }]}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][editRating]}
              </Text>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 16 }]}>Comment (optional)</Text>
            <TextInput
              style={[styles.commentInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              value={editComment}
              onChangeText={setEditComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditingReview(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  (editRating === 0 || isEditSubmitting) && { opacity: 0.5 },
                ]}
                disabled={editRating === 0 || isEditSubmitting}
                onPress={handleEditSubmit}
              >
                {isEditSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, marginTop: 16, gap: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { gap: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  avgRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  avgNum: { fontSize: 16, fontWeight: "800" },
  totalText: { fontSize: 13 },
  writeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  writeBtnText: { fontSize: 13, fontWeight: "600" },

  lockedBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  lockedIconWrap: { paddingTop: 2 },
  lockedTextWrap: { flex: 1, gap: 3 },
  lockedTitle: { fontSize: 14, fontWeight: "700" },
  lockedReason: { fontSize: 13, lineHeight: 18 },

  emptyBox: { alignItems: "center", padding: 24, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "500" },
  emptyHint: { fontSize: 13, textAlign: "center" },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardMeta: { flex: 1, gap: 3 },
  reviewFlagBtn: { padding: 4, alignSelf: "flex-start", marginTop: 2 },
  ownActions: { flexDirection: "row", gap: 4, alignSelf: "flex-start", marginTop: 2 },
  actionBtn: { padding: 4 },
  reviewerName: { fontSize: 14, fontWeight: "600" },
  youBadge: { fontSize: 13, fontWeight: "400" },
  starsDate: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20, opacity: 0.9 },

  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  showMoreText: { fontSize: 14, fontWeight: "600" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 4 },
  sheetHandle: { alignItems: "center", marginBottom: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  starPicker: { flexDirection: "row", gap: 8, marginBottom: 4 },
  ratingLabel: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  commentInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 100, marginBottom: 4 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  submitBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
