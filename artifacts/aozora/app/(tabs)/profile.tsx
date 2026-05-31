import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

function MenuItem({
  icon,
  label,
  onPress,
  danger,
  colors,
}: {
  icon: FeatherIconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? colors.destructive + "15" : colors.secondary }]}>
        <Feather name={icon} size={18} color={danger ? colors.destructive : colors.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? colors.destructive : colors.foreground }]}>{label}</Text>
      {!danger && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, token } = useAuth();
  const [isAppealing, setIsAppealing] = useState(false);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleAppeal = async () => {
    if (!token) return;
    setIsAppealing(true);
    try {
      const res = await fetch(`${BASE_URL}/api/user/admin-conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      router.push(`/admin-conversation/${data.id}`);
    } catch {
      Alert.alert("Error", "Could not open admin chat. Please try again.");
    } finally {
      setIsAppealing(false);
    }
  };

  const verificationColor =
    user?.verificationStatus === "verified"
      ? "#10b981"
      : user?.verificationStatus === "pending"
      ? "#f59e0b"
      : user?.verificationStatus === "rejected"
      ? "#ef4444"
      : colors.mutedForeground;

  const verificationLabel =
    user?.verificationStatus === "verified"
      ? "Verified"
      : user?.verificationStatus === "pending"
      ? "Pending Review"
      : user?.verificationStatus === "rejected"
      ? "Rejected"
      : "Unverified";

  const showAppealBanner =
    user?.verificationStatus === "rejected" && user?.role !== "admin";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 40, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
      </View>

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <UserAvatar
          name={user?.fullName}
          avatarUrl={user?.avatarUrl}
          size={80}
          color={colors.primary}
          backgroundColor={colors.primary + "22"}
          userId={user?.id}
        />
        <Text style={[styles.name, { color: colors.foreground }]}>{user?.fullName || "User"}</Text>
        {user?.universityOrWorkplace ? (
          <Text style={[styles.subInfo, { color: colors.mutedForeground }]}>
            {user.universityOrWorkplace}
          </Text>
        ) : null}
        {user?.email ? (
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
        ) : null}
        {user?.phone ? (
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.phone}</Text>
        ) : null}
        {user?.bio ? (
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{user.bio}</Text>
        ) : null}
        <View style={styles.badges}>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1) || "Student"}
            </Text>
          </View>
          <View style={[styles.verifyBadge, { backgroundColor: verificationColor + "18" }]}>
            {user?.verificationStatus === "verified" && (
              <Ionicons name="checkmark-circle" size={13} color={verificationColor} />
            )}
            {user?.verificationStatus === "rejected" && (
              <Feather name="x-circle" size={13} color={verificationColor} />
            )}
            <Text style={[styles.verifyBadgeText, { color: verificationColor }]}>{verificationLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.editProfileBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
          onPress={() => router.push("/profile/edit")}
          activeOpacity={0.75}
        >
          <Feather name="edit-2" size={14} color={colors.foreground} />
          <Text style={[styles.editProfileBtnText, { color: colors.foreground }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {showAppealBanner && (
        <View style={[styles.appealBanner, { backgroundColor: "#ef444408", borderColor: "#ef444430" }]}>
          <View style={styles.appealBannerTop}>
            <View style={[styles.appealIconWrap, { backgroundColor: "#ef444415" }]}>
              <Feather name="shield-off" size={20} color="#ef4444" />
            </View>
            <View style={styles.appealBannerBody}>
              <Text style={styles.appealBannerTitle}>Verification Rejected</Text>
              <Text style={[styles.appealBannerSub, { color: colors.mutedForeground }]}>
                Your identity submission was not approved. You can appeal this decision directly to our admin team.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.appealBtn, { backgroundColor: "#ef4444" }]}
            onPress={handleAppeal}
            disabled={isAppealing}
            activeOpacity={0.85}
          >
            {isAppealing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="message-circle" size={16} color="#fff" />
                <Text style={styles.appealBtnText}>Appeal Rejection</Text>
                <Feather name="arrow-right" size={15} color="rgba(255,255,255,0.8)" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <MenuItem icon="heart" label="Saved Favorites" onPress={() => router.push("/profile/favorites")} colors={colors} />
        {user?.role !== "admin" && (
          <MenuItem icon="shield" label="Identity Verification" onPress={() => router.push("/profile/verify")} colors={colors} />
        )}
        {user?.role === "owner" && (
          <MenuItem icon="home" label="My Listings" onPress={() => router.push("/profile/my-dorms")} colors={colors} />
        )}
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <MenuItem icon="help-circle" label="Help Center" onPress={() => {}} colors={colors} />
        <MenuItem icon="info" label="About Aozora" onPress={() => router.push("/about")} colors={colors} />
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
        <MenuItem icon="log-out" label="Log Out" onPress={handleLogout} danger colors={colors} />
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>Aozora v1.0.0 · Home, but smarter.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  profileCard: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  name: { fontSize: 22, fontWeight: "bold" },
  subInfo: { fontSize: 13 },
  email: { fontSize: 15 },
  bio: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 2 },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  editProfileBtnText: { fontSize: 13, fontWeight: "600" },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  verifyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifyBadgeText: { fontSize: 13, fontWeight: "600" },

  /* Appeal banner */
  appealBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  appealBannerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  appealIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  appealBannerBody: { flex: 1, gap: 4 },
  appealBannerTitle: { fontSize: 15, fontWeight: "700", color: "#ef4444" },
  appealBannerSub: { fontSize: 13, lineHeight: 18 },
  appealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  appealBtnText: { fontSize: 15, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },

  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14, borderBottomWidth: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 16 },
  version: { textAlign: "center", fontSize: 13, marginTop: 24, marginBottom: 8 },
});
