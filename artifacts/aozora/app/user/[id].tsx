import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { UserAvatar } from "@/components/UserAvatar";

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

export default function PublicProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ? parseInt(id, 10) : 0;

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["publicUser", userId],
    queryFn: () => fetchPublicUser(userId),
    enabled: !!userId,
  });

  const { data: ownerDorms = [] } = useQuery({
    queryKey: ["ownerDorms", userId],
    queryFn: () => fetchOwnerDorms(userId),
    enabled: !!userId && profile?.role === "owner",
  });

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

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
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <UserAvatar
              name={profile.fullName}
              avatarUrl={profile.avatarUrl}
              size={88}
              color={colors.primary}
              backgroundColor={colors.primary + "22"}
            />
            <Text style={[styles.name, { color: colors.foreground }]}>{profile.fullName}</Text>

            {profile.universityOrWorkplace ? (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  {profile.universityOrWorkplace}
                </Text>
              </View>
            ) : null}

            {profile.createdAt ? (
              <View style={styles.infoRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  Member since {formatDate(profile.createdAt)}
                </Text>
              </View>
            ) : null}

            <View style={styles.badges}>
              <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{roleLabel}</Text>
              </View>
              <View style={[styles.verifyBadge, { backgroundColor: verificationColor + "18" }]}>
                {profile.verificationStatus === "verified" && (
                  <Ionicons name="checkmark-circle" size={13} color={verificationColor} />
                )}
                <Text style={[styles.verifyBadgeText, { color: verificationColor }]}>{verificationLabel}</Text>
              </View>
            </View>

            {profile.bio ? (
              <View style={[styles.bioBox, { backgroundColor: colors.secondary, borderRadius: 12 }]}>
                <Text style={[styles.bioText, { color: colors.foreground }]}>{profile.bio}</Text>
              </View>
            ) : null}
          </View>

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
                    <Image
                      source={{ uri: dorm.coverPhotoUrl }}
                      style={[styles.dormImage, { borderRadius: 10 }]}
                    />
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
                    <Text style={[styles.dormPrice, { color: colors.primary }]}>
                      ₱{dorm.monthlyRent?.toLocaleString()}/mo
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    borderBottomWidth: 1,
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
    gap: 10,
  },
  name: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 14 },
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifyBadgeText: { fontSize: 13, fontWeight: "600" },
  bioBox: { padding: 14, width: "100%", marginTop: 4 },
  bioText: { fontSize: 15, lineHeight: 22, textAlign: "center" },

  section: { paddingHorizontal: 16, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  dormCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dormImage: { width: 64, height: 64, flexShrink: 0 },
  dormInfo: { flex: 1, gap: 4 },
  dormName: { fontSize: 15, fontWeight: "600" },
  dormMetaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dormMeta: { fontSize: 13, flex: 1 },
  dormPrice: { fontSize: 14, fontWeight: "700" },
});
