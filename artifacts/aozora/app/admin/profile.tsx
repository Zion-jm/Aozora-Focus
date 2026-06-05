import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader } from "@/components/PageHeader";
import {
  useUpdateProfile,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View
      style={[
        sectionStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <View style={sectionStyles.cardHeader}>
        <View style={[sectionStyles.iconWrap, { backgroundColor: iconColor + "18" }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[sectionStyles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[sectionStyles.divider, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

export default function AdminProfileScreen() {
  const colors = useColors();
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: (data: any) => {
        if (data?.fullName) updateUser({ ...user!, fullName: data.fullName });
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast.success("Profile updated", "Your name has been saved.");
        setIsSavingName(false);
      },
      onError: () => {
        toast.error("Error", "Could not update profile.");
        setIsSavingName(false);
      },
    },
  });

  const handleSaveName = () => {
    if (!fullName.trim()) {
      toast.warning("Required", "Name cannot be empty.");
      return;
    }
    if (fullName.trim() === user?.fullName) {
      toast.info("No change", "Your name is already up to date.");
      return;
    }
    setIsSavingName(true);
    updateProfile.mutate({ data: { fullName: fullName.trim() } });
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning("Required", "Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      toast.warning("Too short", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Mismatch", "New passwords don't match.");
      return;
    }
    setIsSavingPassword(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        toast.success("Password changed", "Your password has been updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Error", (err as any).message ?? "Could not change password.");
      }
    } catch {
      toast.error("Error", "Network error. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const initials = (user?.fullName ?? "A")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="My Profile"
        subtitle="Manage your admin account"
        right={
          <TouchableOpacity onPress={() => router.push("/admin/settings")} style={{ padding: 4 }}>
            <Feather name="settings" size={21} color={colors.foreground} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + identity card */}
        <View
          style={[
            styles.identityCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={[styles.adminBadge, { backgroundColor: "#ef444420" }]}>
              <Feather name="shield" size={11} color="#ef4444" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          </View>
          <View style={styles.identityInfo}>
            <Text style={[styles.identityName, { color: colors.foreground }]}>
              {user?.fullName ?? "—"}
            </Text>
            <Text style={[styles.identityEmail, { color: colors.mutedForeground }]}>
              {user?.email ?? "—"}
            </Text>
            {user?.phone ? (
              <Text style={[styles.identityPhone, { color: colors.mutedForeground }]}>
                {user.phone}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Edit Name */}
        <SectionCard title="Display Name" icon="user" iconColor="#4f46e5" colors={colors}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Feather name="user" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSavingName}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: colors.primary, opacity: isSavingName ? 0.7 : 1 },
            ]}
            onPress={handleSaveName}
            disabled={isSavingName}
          >
            {isSavingName ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="check" size={15} color="#fff" />
                <Text style={styles.saveBtnText}>Save Name</Text>
              </>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* Email (read-only) */}
        <SectionCard title="Email Address" icon="mail" iconColor="#0ea5e9" colors={colors}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Your login email
            </Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: colors.background + "88",
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: 0.75,
                },
              ]}
            >
              <Feather name="mail" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.mutedForeground }]}
                value={user?.email ?? ""}
                editable={false}
              />
              <View style={[styles.lockedBadge, { backgroundColor: colors.border }]}>
                <Feather name="lock" size={11} color={colors.mutedForeground} />
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>Read-only</Text>
              </View>
            </View>
            <Text style={[styles.fieldHint, { color: colors.mutedForeground }]}>
              Email cannot be changed here. Contact a super-admin if a change is needed.
            </Text>
          </View>
        </SectionCard>

        {/* Change Password */}
        <SectionCard title="Change Password" icon="lock" iconColor="#f59e0b" colors={colors}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Current Password
            </Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Feather name="lock" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSavingPassword}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={17}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>New Password</Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Feather name="key" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSavingPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={17}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Confirm New Password
            </Text>
            <View
              style={[
                styles.inputRow,
                { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              <Feather name="key" size={15} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSavingPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={17}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: "#f59e0b", opacity: isSavingPassword ? 0.7 : 1 },
            ]}
            onPress={handleChangePassword}
            disabled={isSavingPassword}
          >
            {isSavingPassword ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="lock" size={15} color="#fff" />
                <Text style={styles.saveBtnText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* Account info */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: "#4f46e510", borderColor: "#4f46e530", borderRadius: colors.radius },
          ]}
        >
          <Feather name="info" size={14} color="#4f46e5" />
          <Text style={styles.infoText}>
            Admin accounts have full platform access. Keep your credentials secure and never share
            them.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 60,
    maxWidth: 640,
    alignSelf: Platform.OS === "web" ? ("center" as any) : undefined,
    width: "100%",
  },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarWrap: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
  identityInfo: {
    flex: 1,
    gap: 3,
  },
  identityName: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  identityEmail: {
    fontSize: 14,
  },
  identityPhone: {
    fontSize: 13,
  },

  fieldGroup: {
    gap: 6,
    padding: 16,
    paddingBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: "600",
  },
  fieldHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    margin: 16,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#4f46e5",
    lineHeight: 19,
  },
});
