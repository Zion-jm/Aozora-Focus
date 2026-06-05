import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { PageHeader } from "@/components/PageHeader";

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
    <View style={[card.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={card.header}>
        <View style={[card.iconWrap, { backgroundColor: iconColor + "18" }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[card.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[card.divider, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

function ActionRow({
  label,
  sublabel,
  onPress,
  last,
  colors,
  danger,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  last?: boolean;
  colors: any;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        rowS.wrap,
        { borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={rowS.text}>
        <Text style={[rowS.label, { color: danger ? "#ef4444" : colors.foreground }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[rowS.sub, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={danger ? "#ef4444" : colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function AdminSettingsScreen() {
  const colors = useColors();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();

  const [resetting, setResetting] = useState(false);

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const initials = (user?.fullName ?? "A")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleResetTestData = () => {
    showConfirm({
      title: "Reset Test Data",
      message:
        "This will permanently delete all test accounts (Maria, Carlos, Ana, Juan) and all their associated data — dorms, appointments, messages, reports, violations, and reviews — then re-seed fresh sample data.\n\nYour admin account will not be affected.",
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
      destructive: true,
      icon: "refresh-cw",
      onConfirm: async () => {
        setResetting(true);
        try {
          const res = await fetch(`${BASE_URL}/api/admin/reset-test-data`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (res.ok) {
            toast.success("Reset complete", data.message ?? "Test data has been cleared and re-seeded.");
          } else {
            toast.error("Reset failed", data.error ?? "Something went wrong.");
          }
        } catch {
          toast.error("Network error", "Could not reach the server.");
        } finally {
          setResetting(false);
        }
      },
    });
  };

  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword) {
      toast.warning("Missing fields", "Please fill in all fields.");
      return;
    }
    if (newAdminPassword.length < 8) {
      toast.warning("Too short", "Password must be at least 8 characters.");
      return;
    }
    setCreatingAdmin(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/create-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newAdminName.trim(),
          email: newAdminEmail.trim().toLowerCase(),
          password: newAdminPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Admin created", `${newAdminName.trim()} can now log in as admin.`);
        setNewAdminName("");
        setNewAdminEmail("");
        setNewAdminPassword("");
        setShowCreateAdmin(false);
      } else {
        toast.error("Failed", data.message ?? "Could not create admin account.");
      }
    } catch {
      toast.error("Network error", "Could not reach the server.");
    } finally {
      setCreatingAdmin(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Settings" subtitle="Admin configuration" showBack onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Identity card */}
        <View style={[styles.identityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityInfo}>
            <View style={styles.identityNameRow}>
              <Text style={[styles.identityName, { color: colors.foreground }]}>
                {user?.fullName ?? "—"}
              </Text>
              <View style={styles.adminBadge}>
                <Feather name="shield" size={11} color="#ef4444" />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            </View>
            <Text style={[styles.identityEmail, { color: colors.mutedForeground }]}>
              {user?.email ?? "—"}
            </Text>
          </View>
        </View>

        {/* Account */}
        <SectionCard title="Account" icon="user" iconColor="#4f46e5" colors={colors}>
          <ActionRow
            label="Edit Profile"
            sublabel="Change your display name or password"
            onPress={() => router.push("/admin/profile")}
            colors={colors}
            last
          />
        </SectionCard>

        {/* Test Data */}
        <SectionCard title="Test Data" icon="database" iconColor="#ef4444" colors={colors}>
          <View style={[styles.dangerInfo, { backgroundColor: "#ef444408", borderColor: "#ef444425" }]}>
            <Feather name="alert-triangle" size={14} color="#ef4444" />
            <Text style={styles.dangerInfoText}>
              This resets all test accounts (Maria, Carlos, Ana, Juan) and their dorms,
              appointments, messages, reports, violations, and reviews — then re-seeds
              fresh sample data. Your admin account stays intact.
            </Text>
          </View>

          <View style={styles.resetWrap}>
            <TouchableOpacity
              style={[styles.resetBtn, { opacity: resetting ? 0.65 : 1 }]}
              onPress={handleResetTestData}
              disabled={resetting}
              activeOpacity={0.8}
            >
              {resetting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={16} color="#fff" />
                  <Text style={styles.resetBtnText}>Reset Test Data</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SectionCard>

        {/* Admin Management */}
        <SectionCard title="Admin Management" icon="users" iconColor="#0ea5e9" colors={colors}>
          <TouchableOpacity
            style={[
              styles.createAdminToggle,
              { borderBottomWidth: showCreateAdmin ? 1 : 0, borderBottomColor: colors.border },
            ]}
            onPress={() => setShowCreateAdmin((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={rowS.text}>
              <Text style={[rowS.label, { color: colors.foreground }]}>Create New Admin</Text>
              <Text style={[rowS.sub, { color: colors.mutedForeground }]}>
                Add another administrator account
              </Text>
            </View>
            <Feather
              name={showCreateAdmin ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>

          {showCreateAdmin && (
            <View style={styles.createAdminForm}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Full Name</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="user" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newAdminName}
                  onChangeText={setNewAdminName}
                  placeholder="Full name"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="words"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="mail" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newAdminEmail}
                  onChangeText={setNewAdminEmail}
                  placeholder="admin@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Password (min. 8 characters)
              </Text>
              <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Feather name="lock" size={15} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  value={newAdminPassword}
                  onChangeText={setNewAdminPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: "#0ea5e9", opacity: creatingAdmin ? 0.7 : 1 }]}
                onPress={handleCreateAdmin}
                disabled={creatingAdmin}
              >
                {creatingAdmin ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="plus" size={15} color="#fff" />
                    <Text style={styles.createBtnText}>Create Admin Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </SectionCard>

        {/* Platform Info */}
        <SectionCard title="Platform Info" icon="info" iconColor="#64748b" colors={colors}>
          <View style={[rowS.wrap, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[rowS.label, { color: colors.foreground }]}>Version</Text>
            <Text style={[rowS.sub, { color: colors.mutedForeground }]}>Aozora v1.0.0</Text>
          </View>
          <View style={[rowS.wrap, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[rowS.label, { color: colors.foreground }]}>Environment</Text>
            <Text style={[rowS.sub, { color: colors.mutedForeground }]}>
              {process.env.NODE_ENV ?? "development"}
            </Text>
          </View>
          <View style={[rowS.wrap, { borderBottomWidth: 0 }]}>
            <Text style={[rowS.label, { color: colors.foreground }]}>Platform</Text>
            <Text style={[rowS.sub, { color: colors.mutedForeground }]}>
              Lopez, Quezon, Philippines
            </Text>
          </View>
        </SectionCard>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Aozora v1.0.0 · Home, but smarter.
        </Text>
      </ScrollView>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 14, marginBottom: 16, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700" },
  divider: { height: 1 },
});

const rowS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "500" },
  sub: { fontSize: 12, lineHeight: 16 },
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
    gap: 14,
    padding: 18,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  identityInfo: { flex: 1, gap: 4 },
  identityNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  identityName: { fontSize: 18, fontWeight: "700" },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef444420",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  adminBadgeText: { fontSize: 11, fontWeight: "700", color: "#ef4444" },
  identityEmail: { fontSize: 13 },

  dangerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    margin: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dangerInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#ef4444",
    lineHeight: 18,
  },

  resetWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  resetBtn: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  resetBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  createAdminToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  createAdminForm: { padding: 16, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 8,
  },
  input: { flex: 1, fontSize: 15, padding: 0 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  createBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  version: { textAlign: "center", fontSize: 13, marginTop: 8, marginBottom: 8 },
});
