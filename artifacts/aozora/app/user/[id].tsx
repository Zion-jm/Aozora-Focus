import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ReportModal } from "@/components/ReportModal";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

async function fetchPublicUser(userId: number) {
  const res = await fetch(`${BASE_URL}/api/users/${userId}`);
  if (!res.ok) throw new Error("User not found");
  return res.json();
}

async function fetchOwnerDorms(ownerId: number) {
  const res = await fetch(`${BASE_URL}/api/dorms?ownerId=${ownerId}&limit=50`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.dorms ?? [];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long" });
}

function StatBox({
  value,
  label,
  colors,
}: {
  value: string | number;
  label: string;
  colors: any;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.secondary, borderRadius: 14 }]}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ? parseInt(id, 10) : 0;
  const { user: me, token } = useAuth();

  const [showDormPicker, setShowDormPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"owner" | "student">("owner");
  const [isMessaging, setIsMessaging] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["publicUser", userId],
    queryFn: () => fetchPublicUser(userId),
    enabled: !!userId,
  });

  // Profile user's dorms (when viewing an owner's profile)
  const { data: ownerDorms = [] } = useQuery<any[]>({
    queryKey: ["ownerDorms", userId],
    queryFn: () => fetchOwnerDorms(userId),
    enabled: !!userId && profile?.role === "owner",
  });

  // Viewer's own dorms (when an owner is viewing a student's profile)
  const { data: myDorms = [] } = useQuery<any[]>({
    queryKey: ["myDorms", me?.id],
    queryFn: () => fetchOwnerDorms(me!.id),
    enabled: !!me && me.role === "owner" && profile?.role === "student" && !isOwnProfile,
  });

  const isOwnProfile = me?.id === userId;
  // Message an owner about their dorm (student → owner)
  const canMessageOwner = !!me && !isOwnProfile && profile?.role === "owner" && ownerDorms.length > 0;
  // Message a student about the viewer's dorm (owner → student)
  const canMessageStudent = !!me && !isOwnProfile && me.role === "owner" && profile?.role === "student" && myDorms.length > 0;
  const canMessage = canMessageOwner || canMessageStudent;
  // Phone visible only if API returned it (handled server-side by phonePublic flag)
  const canCall = !!profile?.phone;

  const handleCall = () => {
    if (!profile?.phone) return;
    const tel = `tel:${profile.phone.replace(/\s/g, "")}`;
    Linking.openURL(tel).catch(() =>
      Alert.alert("Cannot call", "Your device doesn't support phone calls.")
    );
  };

  const totalAvailableBeds = ownerDorms.reduce((s: number, d: any) => s + (d.availableBeds ?? 0), 0);
  const avgRating =
    ownerDorms.length > 0
      ? ownerDorms.reduce((s: number, d: any) => s + (d.averageRating ?? 0), 0) / ownerDorms.length
      : null;

  const verificationColor =
    profile?.verificationStatus === "verified"
      ? "#10b981"
      : profile?.verificationStatus === "pending"
      ? "#f59e0b"
      : profile?.verificationStatus === "rejected"
      ? "#ef4444"
      : colors.mutedForeground;

  const verificationLabel =
    profile?.verificationStatus === "verified"
      ? "Verified"
      : profile?.verificationStatus === "pending"
      ? "Pending"
      : profile?.verificationStatus === "rejected"
      ? "Rejected"
      : "Unverified";

  const roleLabel =
    profile?.role === "owner"
      ? "Dorm Owner"
      : profile?.role === "admin"
      ? "Administrator"
      : "Student";

  const roleColor =
    profile?.role === "admin"
      ? "#ef4444"
      : colors.primary;

  // Student → Owner: inquire about one of the owner's dorms
  const startConversation = async (dorm: any) => {
    if (!token) return;
    setIsMessaging(true);
    setShowDormPicker(false);
    try {
      const res = await fetch(`${BASE_URL}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dormId: dorm.id,
          initialMessage: `Hi! I'm interested in ${dorm.name}. Is it still available?`,
        }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      const data = await res.json();
      router.push(`/conversation/${data.id}`);
    } catch {
      Alert.alert("Error", "Could not start conversation. Please try again.");
    } finally {
      setIsMessaging(false);
    }
  };

  // Owner → Student: start a conversation about one of the owner's own dorms
  const startConversationWithStudent = async (dorm: any) => {
    if (!token) return;
    setIsMessaging(true);
    setShowDormPicker(false);
    try {
      const res = await fetch(`${BASE_URL}/api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dormId: dorm.id,
          targetStudentId: userId,
          initialMessage: `Hi ${profile?.fullName?.split(" ")[0] ?? "there"}! I'm reaching out about ${dorm.name}.`,
        }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      const data = await res.json();
      router.push(`/conversation/${data.id}`);
    } catch {
      Alert.alert("Error", "Could not start conversation. Please try again.");
    } finally {
      setIsMessaging(false);
    }
  };

  const handleMessage = () => {
    if (canMessageOwner) {
      if (ownerDorms.length === 1) {
        startConversation(ownerDorms[0]);
      } else {
        setPickerMode("owner");
        setShowDormPicker(true);
      }
    } else if (canMessageStudent) {
      if (myDorms.length === 1) {
        startConversationWithStudent(myDorms[0]);
      } else {
        setPickerMode("student");
        setShowDormPicker(true);
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {profile?.fullName?.split(" ")[0] ?? "Profile"}
        </Text>
        {!isOwnProfile && !!me && !!profile ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setShowReport(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="flag" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetType="user"
        targetId={userId}
        targetLabel={profile?.fullName}
        token={token}
        colors={colors}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError || !profile ? (
        <View style={styles.center}>
          <Feather name="user-x" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>User not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.primary }]}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <UserAvatar
              name={profile.fullName}
              avatarUrl={profile.avatarUrl}
              size={96}
              color={roleColor}
              backgroundColor={roleColor + "22"}
            />

            <Text style={[styles.name, { color: colors.foreground }]}>{profile.fullName}</Text>

            {/* Badges */}
            <View style={styles.badges}>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
                {profile.role === "admin" && <Feather name="shield" size={12} color={roleColor} />}
                {profile.role === "owner" && <Feather name="home" size={12} color={roleColor} />}
                {profile.role === "student" && <Ionicons name="school" size={12} color={roleColor} />}
                <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
              </View>
              <View style={[styles.verifyBadge, { backgroundColor: verificationColor + "18" }]}>
                {profile.verificationStatus === "verified" ? (
                  <Ionicons name="checkmark-circle" size={13} color={verificationColor} />
                ) : (
                  <Feather name="circle" size={12} color={verificationColor} />
                )}
                <Text style={[styles.verifyBadgeText, { color: verificationColor }]}>{verificationLabel}</Text>
              </View>
            </View>

            {/* Bio */}
            {profile.bio ? (
              <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text>
            ) : null}

            {/* Public meta */}
            <View style={styles.metaGroup}>
              {profile.universityOrWorkplace ? (
                <View style={styles.metaRow}>
                  <Feather name="briefcase" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    {profile.universityOrWorkplace}
                  </Text>
                </View>
              ) : null}
              {profile.createdAt ? (
                <View style={styles.metaRow}>
                  <Feather name="calendar" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    Member since {formatDate(profile.createdAt)}
                  </Text>
                </View>
              ) : null}
              {canCall ? (
                <View style={styles.metaRow}>
                  <Feather name="phone" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{profile.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Action buttons */}
            {(canMessage || canCall) && !isOwnProfile && (
              <View style={styles.actionRow}>
                {canMessage && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handleMessage}
                    disabled={isMessaging}
                    activeOpacity={0.85}
                  >
                    {isMessaging ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Feather name="message-circle" size={17} color="#fff" />
                        <Text style={styles.actionBtnText}>Message</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {canCall && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#10b981", flex: 1 }]}
                    onPress={handleCall}
                    activeOpacity={0.85}
                  >
                    <Feather name="phone-call" size={17} color="#fff" />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Owner stats */}
          {profile.role === "owner" && ownerDorms.length > 0 && (
            <View style={styles.statsRow}>
              <StatBox value={ownerDorms.length} label="Listings" colors={colors} />
              <StatBox value={totalAvailableBeds} label="Beds Available" colors={colors} />
              <StatBox
                value={avgRating !== null && avgRating > 0 ? avgRating.toFixed(1) + " ★" : "—"}
                label="Avg Rating"
                colors={colors}
              />
            </View>
          )}

          {/* Dorm Listings */}
          {profile.role === "owner" && ownerDorms.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Listings by {profile.fullName.split(" ")[0]}
              </Text>
              {ownerDorms.map((dorm: any) => (
                <TouchableOpacity
                  key={dorm.id}
                  style={[styles.dormCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/dorm/${dorm.id}`)}
                  activeOpacity={0.85}
                >
                  {dorm.coverPhotoUrl ? (
                    <Image source={{ uri: dorm.coverPhotoUrl }} style={[styles.dormImage, { borderRadius: 10 }]} />
                  ) : (
                    <View style={[styles.dormImage, { backgroundColor: colors.primary + "18", borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
                      <Feather name="home" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.dormInfo}>
                    <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>
                      {dorm.name}
                    </Text>
                    <View style={styles.dormMetaRow}>
                      <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.dormMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {dorm.address}
                      </Text>
                    </View>
                    <View style={styles.dormBottom}>
                      <Text style={[styles.dormPrice, { color: colors.primary }]}>
                        ₱{dorm.monthlyRent?.toLocaleString()}/mo
                      </Text>
                      <View style={[styles.bedsPill, { backgroundColor: dorm.availableBeds > 0 ? "#10b98118" : "#ef444418" }]}>
                        <Text style={[styles.bedsPillText, { color: dorm.availableBeds > 0 ? "#10b981" : "#ef4444" }]}>
                          {dorm.availableBeds > 0 ? `${dorm.availableBeds} beds` : "Full"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ReviewsSection
            type="user"
            targetId={Number(id)}
            token={token}
            colors={colors}
          />
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Dorm Picker Modal */}
      <Modal
        visible={showDormPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDormPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDormPicker(false)}
        >
          <View
            style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {pickerMode === "student"
                ? `Which of your listings do you want to message ${profile?.fullName?.split(" ")[0] ?? "them"} about?`
                : "Which listing are you inquiring about?"}
            </Text>
            {(pickerMode === "student" ? myDorms : ownerDorms).map((dorm: any) => (
              <TouchableOpacity
                key={dorm.id}
                style={[styles.pickerItem, { borderColor: colors.border }]}
                onPress={() => pickerMode === "student" ? startConversationWithStudent(dorm) : startConversation(dorm)}
                activeOpacity={0.8}
              >
                {dorm.coverPhotoUrl ? (
                  <Image source={{ uri: dorm.coverPhotoUrl }} style={[styles.pickerThumb, { borderRadius: 8 }]} />
                ) : (
                  <View style={[styles.pickerThumb, { borderRadius: 8, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="home" size={18} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerName, { color: colors.foreground }]} numberOfLines={1}>{dorm.name}</Text>
                  <Text style={[styles.pickerMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                    ₱{dorm.monthlyRent?.toLocaleString()}/mo · {dorm.availableBeds ?? 0} beds available
                  </Text>
                </View>
                <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setShowDormPicker(false)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorText: { fontSize: 16, textAlign: "center" },
  backLink: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backLinkText: { color: "#fff", fontWeight: "600" },

  profileCard: {
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  name: { fontSize: 23, fontWeight: "bold", textAlign: "center" },
  bio: { fontSize: 15, lineHeight: 22, textAlign: "center", opacity: 0.85 },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  verifyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  verifyBadgeText: { fontSize: 13, fontWeight: "600" },

  metaGroup: { width: "100%", gap: 10, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 14, flex: 1 },
  callChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  callChipText: { fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginBottom: 4 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: "center" },

  section: { paddingHorizontal: 16, gap: 10, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  dormCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  dormImage: { width: 68, height: 68, flexShrink: 0 },
  dormInfo: { flex: 1, gap: 4 },
  dormName: { fontSize: 15, fontWeight: "600" },
  dormMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dormMeta: { fontSize: 13, flex: 1 },
  dormBottom: { flexDirection: "row", alignItems: "center", gap: 8 },
  dormPrice: { fontSize: 14, fontWeight: "700" },
  bedsPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  bedsPillText: { fontSize: 12, fontWeight: "600" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  pickerItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  pickerThumb: { width: 52, height: 52, flexShrink: 0 },
  pickerName: { fontSize: 15, fontWeight: "600" },
  pickerMeta: { fontSize: 13, marginTop: 2 },
  cancelBtn: { marginTop: 4, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
