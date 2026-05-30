import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  useAdminGetUserDetail,
  useAdminReviewVerification,
  useAdminUpdateUserStatus,
  getAdminGetUserDetailQueryKey,
  getAdminGetUsersQueryKey,
  getAdminGetVerificationsQueryKey,
} from "@workspace/api-client-react";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const STATUS_COLOR: Record<string, string> = {
  unverified: "#64748b",
  pending: "#f59e0b",
  verified: "#10b981",
  rejected: "#ef4444",
};

const VERIF_STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
  colors: any;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon as any} size={15} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function AdminUserDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const uid = parseInt(userId ?? "0");

  const [photoModalUri, setPhotoModalUri] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useAdminGetUserDetail(uid, {
    query: { queryKey: getAdminGetUserDetailQueryKey(uid) },
  });
  const user = data as any;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getAdminGetUserDetailQueryKey(uid) });
    qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
    qc.invalidateQueries({ queryKey: getAdminGetVerificationsQueryKey() });
  };

  const reviewMutation = useAdminReviewVerification({
    mutation: { onSuccess: invalidate, onError: () => Alert.alert("Error", "Could not update verification.") },
  });

  const statusMutation = useAdminUpdateUserStatus({
    mutation: { onSuccess: invalidate, onError: () => Alert.alert("Error", "Could not update user status.") },
  });

  const handleReview = (verifId: number, status: "approved" | "rejected") => {
    Alert.alert(
      status === "approved" ? "Approve ID?" : "Reject ID?",
      `Mark this verification as ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "approved" ? "Approve" : "Reject",
          style: status === "rejected" ? "destructive" : "default",
          onPress: () => {
            reviewMutation.mutate({
              verificationId: verifId,
              data: { status, reviewNote: reviewNote || undefined },
            });
            setReviewNote("");
            setReviewingId(null);
          },
        },
      ]
    );
  };

  const handleToggleSuspend = () => {
    const action = user?.isSuspended ? "Unsuspend" : "Suspend";
    Alert.alert(`${action} User?`, `${action} ${user?.fullName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action,
        style: user?.isSuspended ? "default" : "destructive",
        onPress: () => statusMutation.mutate({ userId: uid, data: { isSuspended: !user?.isSuspended } }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>User Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isError || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>User Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load user profile</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pendingVerif = (user.verificationRecords ?? []).find((v: any) => v.status === "pending");
  const otherVerifs = (user.verificationRecords ?? []).filter((v: any) => v.status !== "pending");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>User Profile</Text>
        <TouchableOpacity
          style={[
            styles.suspendBtn,
            { borderColor: user.isSuspended ? "#10b981" : "#ef4444" },
          ]}
          onPress={handleToggleSuspend}
          disabled={statusMutation.isPending}
        >
          <Text style={[styles.suspendBtnText, { color: user.isSuspended ? "#10b981" : "#ef4444" }]}>
            {user.isSuspended ? "Unsuspend" : "Suspend"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {user.avatarUrl ? (
            <TouchableOpacity onPress={() => setPhotoModalUri(user.avatarUrl)}>
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                {(user.fullName || "U")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.userName, { color: colors.foreground }]}>{user.fullName}</Text>
          {user.universityOrWorkplace ? (
            <Text style={[styles.userSub, { color: colors.mutedForeground }]}>{user.universityOrWorkplace}</Text>
          ) : null}

          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[user.verificationStatus] ?? "#64748b") + "18" }]}>
              {user.verificationStatus === "verified" && (
                <Ionicons name="checkmark-circle" size={12} color={STATUS_COLOR[user.verificationStatus]} />
              )}
              <Text style={[styles.badgeText, { color: STATUS_COLOR[user.verificationStatus] ?? "#64748b" }]}>
                {user.verificationStatus.charAt(0).toUpperCase() + user.verificationStatus.slice(1)}
              </Text>
            </View>
            {user.isSuspended && (
              <View style={[styles.badge, { backgroundColor: "#ef444418" }]}>
                <Text style={[styles.badgeText, { color: "#ef4444" }]}>Suspended</Text>
              </View>
            )}
          </View>
        </View>

        {/* Personal information */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PERSONAL INFORMATION</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <InfoRow icon="mail" label="Email" value={user.email} colors={colors} />
          <InfoRow icon="phone" label="Phone" value={user.phone} colors={colors} />
          <InfoRow icon="calendar" label="Birthday" value={user.birthday} colors={colors} />
          <InfoRow icon="book-open" label="University / Workplace" value={user.universityOrWorkplace} colors={colors} />
          <InfoRow icon="message-square" label="Bio" value={user.bio} colors={colors} />
          {!user.email && !user.phone && !user.birthday && !user.universityOrWorkplace && !user.bio && (
            <Text style={[styles.emptyNote, { color: colors.mutedForeground }]}>No personal information on file.</Text>
          )}
        </View>

        {/* Emergency contact */}
        {(user.emergencyContactName || user.emergencyContactPhone) && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>EMERGENCY CONTACT</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <InfoRow icon="user" label="Name" value={user.emergencyContactName} colors={colors} />
              <InfoRow icon="phone" label="Phone" value={user.emergencyContactPhone} colors={colors} />
            </View>
          </>
        )}

        {/* Account info */}
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[styles.accountRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.accountCell}>
            <Text style={[styles.accountLabel, { color: colors.mutedForeground }]}>Member Since</Text>
            <Text style={[styles.accountValue, { color: colors.foreground }]}>
              {new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
          <View style={styles.accountCell}>
            <Text style={[styles.accountLabel, { color: colors.mutedForeground }]}>User ID</Text>
            <Text style={[styles.accountValue, { color: colors.foreground }]}>#{user.id}</Text>
          </View>
          <View style={[styles.accountDivider, { backgroundColor: colors.border }]} />
          <View style={styles.accountCell}>
            <Text style={[styles.accountLabel, { color: colors.mutedForeground }]}>Submissions</Text>
            <Text style={[styles.accountValue, { color: colors.foreground }]}>
              {(user.verificationRecords ?? []).length}
            </Text>
          </View>
        </View>

        {/* Pending verification — full review panel */}
        {pendingVerif && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PENDING VERIFICATION</Text>
            <View style={[styles.verifCard, { backgroundColor: colors.card, borderColor: "#f59e0b", borderRadius: colors.radius }]}>
              <View style={styles.verifMeta}>
                <View style={[styles.badge, { backgroundColor: "#f59e0b18" }]}>
                  <Text style={[styles.badgeText, { color: "#f59e0b" }]}>Pending</Text>
                </View>
                <Text style={[styles.verifDate, { color: colors.mutedForeground }]}>
                  Submitted {new Date(pendingVerif.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                </Text>
              </View>
              <Text style={[styles.verifIdType, { color: colors.foreground }]}>
                ID Type: <Text style={{ fontWeight: "700" }}>{pendingVerif.idType}</Text>
              </Text>

              {pendingVerif.idImageUrl ? (
                <TouchableOpacity onPress={() => setPhotoModalUri(pendingVerif.idImageUrl)}>
                  <Image
                    source={{ uri: pendingVerif.idImageUrl }}
                    style={[styles.idPhoto, { borderRadius: colors.radius, borderColor: colors.border }]}
                    resizeMode="cover"
                  />
                  <View style={styles.idPhotoOverlay}>
                    <Feather name="zoom-in" size={18} color="#fff" />
                    <Text style={styles.idPhotoOverlayText}>Tap to enlarge</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={[styles.noPhoto, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
                  <Feather name="image" size={32} color={colors.mutedForeground} />
                  <Text style={[{ color: colors.mutedForeground, fontSize: 13 }]}>No image attached</Text>
                </View>
              )}

              {/* Review note input */}
              {reviewingId === pendingVerif.id ? (
                <View style={styles.noteWrap}>
                  <Text style={[styles.noteLabel, { color: colors.foreground }]}>Review note (optional)</Text>
                  <TextInput
                    style={[styles.noteInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background, borderRadius: colors.radius }]}
                    placeholder="Add a note for the user..."
                    placeholderTextColor={colors.mutedForeground}
                    value={reviewNote}
                    onChangeText={setReviewNote}
                    multiline
                  />
                </View>
              ) : null}

              <View style={styles.verifActions}>
                {reviewingId !== pendingVerif.id ? (
                  <TouchableOpacity
                    style={[styles.noteToggleBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                    onPress={() => setReviewingId(pendingVerif.id)}
                  >
                    <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.noteToggleText, { color: colors.mutedForeground }]}>Add note</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.noteToggleBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
                    onPress={() => { setReviewingId(null); setReviewNote(""); }}
                  >
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.noteToggleText, { color: colors.mutedForeground }]}>Cancel note</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.verifButtons}>
                <TouchableOpacity
                  style={[styles.approveBtn, { borderRadius: colors.radius }]}
                  onPress={() => handleReview(pendingVerif.id, "approved")}
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.btnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.rejectBtn, { borderRadius: colors.radius }]}
                  onPress={() => handleReview(pendingVerif.id, "rejected")}
                  disabled={reviewMutation.isPending}
                >
                  <Feather name="x-circle" size={16} color="#fff" />
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Past verifications */}
        {otherVerifs.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>VERIFICATION HISTORY</Text>
            {otherVerifs.map((v: any) => (
              <View
                key={v.id}
                style={[styles.verifCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              >
                <View style={styles.verifMeta}>
                  <View style={[styles.badge, { backgroundColor: (VERIF_STATUS_COLOR[v.status] ?? "#64748b") + "18" }]}>
                    {v.status === "approved" && <Ionicons name="checkmark-circle" size={12} color="#10b981" />}
                    {v.status === "rejected" && <Feather name="x-circle" size={12} color="#ef4444" />}
                    <Text style={[styles.badgeText, { color: VERIF_STATUS_COLOR[v.status] ?? "#64748b" }]}>
                      {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={[styles.verifDate, { color: colors.mutedForeground }]}>
                    {new Date(v.submittedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                  </Text>
                </View>
                <Text style={[styles.verifIdType, { color: colors.mutedForeground }]}>ID: {v.idType}</Text>
                {v.reviewNote && (
                  <View style={[styles.reviewNoteBox, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
                    <Text style={[styles.reviewNoteLabel, { color: colors.mutedForeground }]}>Admin Note</Text>
                    <Text style={[styles.reviewNoteText, { color: colors.foreground }]}>{v.reviewNote}</Text>
                  </View>
                )}
                {v.idImageUrl && (
                  <TouchableOpacity onPress={() => setPhotoModalUri(v.idImageUrl)}>
                    <Image
                      source={{ uri: v.idImageUrl }}
                      style={[styles.idPhotoSmall, { borderRadius: 8, borderColor: colors.border }]}
                      resizeMode="cover"
                    />
                    <Text style={[styles.tapToEnlarge, { color: colors.mutedForeground }]}>Tap to enlarge</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {(user.verificationRecords ?? []).length === 0 && (
          <View style={[styles.noVerif, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Feather name="shield" size={32} color={colors.mutedForeground} />
            <Text style={[{ color: colors.mutedForeground }]}>No verification records</Text>
          </View>
        )}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal visible={!!photoModalUri} transparent animationType="fade" onRequestClose={() => setPhotoModalUri(null)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPhotoModalUri(null)}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          {photoModalUri && (
            <Image
              source={{ uri: photoModalUri }}
              style={styles.modalPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  suspendBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  suspendBtnText: { fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  body: { padding: 16, gap: 12 },

  profileCard: { borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 38, fontWeight: "bold" },
  userName: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  userSub: { fontSize: 14 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },

  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginTop: 4, paddingHorizontal: 2 },

  infoCard: { borderWidth: 1, padding: 4 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15 },
  emptyNote: { fontSize: 13, padding: 14, textAlign: "center" },

  accountRow: { flexDirection: "row", borderWidth: 1, overflow: "hidden" },
  accountCell: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  accountDivider: { width: 1 },
  accountLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  accountValue: { fontSize: 13, fontWeight: "700" },

  verifCard: { borderWidth: 1.5, padding: 16, gap: 12 },
  verifMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  verifDate: { fontSize: 12 },
  verifIdType: { fontSize: 14 },
  idPhoto: { width: "100%", height: 200, borderWidth: 1 },
  idPhotoOverlay: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  idPhotoOverlayText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  noPhoto: { height: 100, alignItems: "center", justifyContent: "center", gap: 8 },
  idPhotoSmall: { width: "100%", height: 140, borderWidth: 1 },
  tapToEnlarge: { fontSize: 11, textAlign: "center", marginTop: 4 },

  noteWrap: { gap: 6 },
  noteLabel: { fontSize: 13, fontWeight: "600" },
  noteInput: { borderWidth: 1, padding: 12, fontSize: 14, minHeight: 64, textAlignVertical: "top" },
  noteToggleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, alignSelf: "flex-start" },
  noteToggleText: { fontSize: 13 },
  verifActions: { flexDirection: "row" },
  verifButtons: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, backgroundColor: "#10b981" },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, backgroundColor: "#ef4444" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  reviewNoteBox: { padding: 10, gap: 3 },
  reviewNoteLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  reviewNoteText: { fontSize: 13 },
  noVerif: { borderWidth: 1, padding: 30, alignItems: "center", gap: 10 },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  modalClose: { position: "absolute", top: 50, right: 20, width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20 },
  modalPhoto: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 },
});
