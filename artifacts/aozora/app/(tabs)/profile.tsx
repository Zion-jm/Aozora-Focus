import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

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
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "22" }]}>
          <Text style={[styles.avatarLetter, { color: colors.primary }]}>
            {(user?.fullName || "U")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{user?.fullName || "User"}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email || user?.phone || ""}</Text>
        <View style={styles.badges}>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1) || "Student"}
            </Text>
          </View>
          <View style={[styles.verifyBadge, { backgroundColor: verificationColor + "18" }]}>
            {user?.verificationStatus === "verified" && (
              <AntDesign name="checkcircle" size={13} color={verificationColor} />
            )}
            <Text style={[styles.verifyBadgeText, { color: verificationColor }]}>{verificationLabel}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <MenuItem icon="heart" label="Saved Favorites" onPress={() => router.push("/profile/favorites")} colors={colors} />
        {user?.role !== "admin" && (
          <MenuItem icon="shield" label="ID Verification" onPress={() => router.push("/profile/verify")} colors={colors} />
        )}
        {user?.role === "owner" && (
          <MenuItem icon="home" label="My Listings" onPress={() => router.push("/profile/my-dorms")} colors={colors} />
        )}
        {user?.role === "admin" && (
          <MenuItem icon="settings" label="Admin Panel" onPress={() => router.push("/admin")} colors={colors} />
        )}
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <MenuItem icon="help-circle" label="Help Center" onPress={() => {}} colors={colors} />
        <MenuItem icon="info" label="About Aozora" onPress={() => {}} colors={colors} />
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
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 36, fontWeight: "bold" },
  name: { fontSize: 22, fontWeight: "bold" },
  email: { fontSize: 15 },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  roleBadgeText: { fontSize: 13, fontWeight: "600" },
  verifyBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  verifyBadgeText: { fontSize: 13, fontWeight: "600" },
  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14, borderBottomWidth: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 16 },
  version: { textAlign: "center", fontSize: 13, marginTop: 24, marginBottom: 8 },
});
