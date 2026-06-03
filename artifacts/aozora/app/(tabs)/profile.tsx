import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

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
  const { user, logout } = useAuth();
  const { showConfirm } = useConfirm();
  const handleLogout = () => {
    showConfirm({
      title: "Log out",
      message: "Are you sure you want to log out?",
      confirmLabel: "Log out",
      cancelLabel: "Cancel",
      destructive: true,
      icon: "log-out",
      onConfirm: async () => {
        await logout();
        router.replace("/(auth)/login");
      },
    });
  };

  const handleAppeal = () => {
    router.push("/help-center?type=appeal_rejection");
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
          { paddingTop: insets.top || 40, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        {user?.role === "admin" && (
          <TouchableOpacity
            onPress={() => router.push("/admin")}
            style={styles.adminBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="shield" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
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
        {/* All personal details */}
        <View style={styles.infoGroup}>
          {user?.email ? (
            <View style={styles.infoRow}>
              <Feather name="mail" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{user.email}</Text>
            </View>
          ) : null}
          {user?.phone ? (
            <View style={styles.infoRow}>
              <Feather name="phone" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{user.phone}</Text>
              <View style={[
                styles.visibilityChip,
                { backgroundColor: (user as any).phonePublic ? "#10b98118" : colors.secondary },
              ]}>
                <Feather
                  name={(user as any).phonePublic ? "eye" : "eye-off"}
                  size={12}
                  color={(user as any).phonePublic ? "#10b981" : colors.mutedForeground}
                />
                <Text style={[
                  styles.visibilityChipText,
                  { color: (user as any).phonePublic ? "#10b981" : colors.mutedForeground },
                ]}>
                  {(user as any).phonePublic ? "Public" : "Hidden"}
                </Text>
              </View>
            </View>
          ) : null}
          {user?.universityOrWorkplace ? (
            <View style={styles.infoRow}>
              <Feather name="briefcase" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{user.universityOrWorkplace}</Text>
            </View>
          ) : null}
          {(user as any)?.birthday ? (
            <View style={styles.infoRow}>
              <Feather name="gift" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{(user as any).birthday}</Text>
            </View>
          ) : null}
          {(user as any)?.emergencyContactName ? (
            <View style={styles.infoRow}>
              <Feather name="user-check" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Emergency: {(user as any).emergencyContactName}
                {(user as any).emergencyContactPhone ? ` · ${(user as any).emergencyContactPhone}` : ""}
              </Text>
            </View>
          ) : null}
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
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={16} color="#fff" />
            <Text style={styles.appealBtnText}>Appeal Rejection</Text>
            <Feather name="arrow-right" size={15} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <MenuItem icon="heart" label="Saved Favorites" onPress={() => router.push("/profile/favorites")} colors={colors} />
        {user?.role !== "admin" && (
          <MenuItem icon="star" label="My Reviews" onPress={() => router.push("/profile/reviews")} colors={colors} />
        )}
        {user?.role !== "admin" && (
          <MenuItem icon="flag" label="My Reports" onPress={() => router.push("/my-reports")} colors={colors} />
        )}
        {user?.role !== "admin" && (
          <MenuItem icon="shield" label="Identity Verification" onPress={() => router.push("/profile/verify")} colors={colors} />
        )}
        {user?.role !== "admin" && (
          <MenuItem icon="alert-octagon" label="My Violations & Standing" onPress={() => router.push("/profile/violations")} colors={colors} />
        )}
        {user?.role === "owner" && (
          <MenuItem icon="home" label="My Listings" onPress={() => router.push("/profile/my-dorms")} colors={colors} />
        )}
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUPPORT</Text>
        {user?.role !== "admin" && (
          <MenuItem icon="inbox" label="My Support Tickets" onPress={() => router.push("/my-tickets")} colors={colors} />
        )}
        <MenuItem icon="help-circle" label="Help Center" onPress={() => router.push("/help-center")} colors={colors} />
        <MenuItem icon="book-open" label="Community Guidelines" onPress={() => router.push("/community-guidelines")} colors={colors} />
        <MenuItem icon="file-text" label="Terms of Service" onPress={() => router.push("/terms-of-service")} colors={colors} />
        <MenuItem icon="lock" label="Privacy Policy" onPress={() => router.push("/privacy-policy")} colors={colors} />
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
  header: { paddingHorizontal: 20, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  adminBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  profileCard: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  name: { fontSize: 22, fontWeight: "bold" },
  subInfo: { fontSize: 13 },
  email: { fontSize: 15 },
  bio: { fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 2 },
  infoGroup: { width: "100%", gap: 10, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, flex: 1 },
  visibilityChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  visibilityChipText: { fontSize: 11, fontWeight: "600" },
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
