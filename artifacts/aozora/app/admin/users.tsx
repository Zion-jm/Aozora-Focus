import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminGetUsersQueryKey,
  useAdminGetUsers,
  useAdminUpdateUserStatus,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const ROLE_COLOR: Record<string, string> = {
  boarder: "#0ea5e9",
  owner: "#8b5cf6",
  admin: "#ef4444",
};

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token } = useAuth();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [messagingUserId, setMessagingUserId] = useState<number | null>(null);

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [showAdminConfirmPass, setShowAdminConfirmPass] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetUsers({
    query: { queryKey: getAdminGetUsersQueryKey(), refetchInterval: 8_000 },
  });

  const allUsers = (data as any)?.users || [];

  const filtered = useMemo(() => {
    let result = allUsers;
    if (filter !== "all") {
      result = result.filter((u: any) => u.role === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u: any) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allUsers, filter, search]);

  const update = useAdminUpdateUserStatus({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() }),
      onError: () => toast.error("Error", "Could not update user."),
    },
  });

  const [unsuspending, setUnsuspending] = useState<number | null>(null);

  const handleUnsuspend = (user: any) => {
    showConfirm({
      title: "Unsuspend User?",
      message: `⚠️ Warning: This user has active violations on record.\n\nUnsuspending ${user.fullName} will override the suspension and restore their full account access immediately. A suspension-lifted email will be sent to them.\n\nThis action cannot be undone without re-suspending the user manually.`,
      confirmLabel: "Unsuspend & Notify",
      destructive: false,
      icon: "user-check",
      onConfirm: async () => {
        if (!token) return;
        setUnsuspending(user.id);
        try {
          const res = await fetch(`${BASE_URL}/api/admin/users/${user.id}/unsuspend`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
            toast.success("Unsuspended", `${user.fullName}'s account has been reinstated.`);
          } else {
            const err = await res.json().catch(() => ({}));
            toast.error("Error", (err as any).message ?? "Could not unsuspend user.");
          }
        } catch {
          toast.error("Error", "Network error. Please try again.");
        } finally {
          setUnsuspending(null);
        }
      },
    });
  };

  const toggleSuspend = (user: any) => {
    if (user.isSuspended) {
      handleUnsuspend(user);
      return;
    }
    showConfirm({
      title: "Suspend User?",
      message: `Are you sure you want to suspend ${user.fullName}?`,
      confirmLabel: "Suspend",
      destructive: true,
      icon: "user-x",
      onConfirm: () => update.mutate({ userId: user.id, data: { isSuspended: true } }),
    });
  };

  const openMessageUser = async (user: any) => {
    if (!token) return;
    setMessagingUserId(user.id);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        toast.error("Error", "Could not open conversation.");
        return;
      }
      const conv = await res.json();
      router.push(`/admin-conversation/${conv.id}`);
    } catch {
      toast.error("Error", "Network error. Please try again.");
    } finally {
      setMessagingUserId(null);
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
      toast.warning("Required", "Please fill in all fields.");
      return;
    }
    if (adminPassword.length < 8) {
      toast.warning("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      toast.warning("Mismatch", "Passwords don't match.");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail.trim(), fullName: adminName.trim(), password: adminPassword }),
      });
      if (res.ok) {
        toast.success("Admin Created", `${adminName.trim()} can now sign in to the admin portal.`);
        setShowCreateAdmin(false);
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
        setAdminConfirmPassword("");
        qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Error", (err as any).message ?? "Could not create admin.");
      }
    } catch {
      toast.error("Error", "Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const FILTERS = ["all", "boarder", "owner", "admin"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="User Management"
        subtitle="View and manage platform users"
        right={
          <TouchableOpacity
            style={[styles.addAdminBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateAdmin(true)}
          >
            <Feather name="user-plus" size={14} color="#fff" />
            <Text style={styles.addAdminBtnText}>Add Admin</Text>
          </TouchableOpacity>
        }
      />

      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, email, or phone…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
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
            style={[
              styles.filterBtn,
              { borderRadius: 20 },
              filter === f && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
          <Text style={{ color: colors.destructive }}>Failed to load users</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                item.isSuspended && { opacity: 0.6 },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: (ROLE_COLOR[item.role] || colors.primary) + "22" }]}>
                <Text style={[styles.avatarText, { color: ROLE_COLOR[item.role] || colors.primary }]}>
                  {(item.fullName || "U")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.fullName}</Text>
                  {item.verificationStatus === "verified" && (
                    <Ionicons name="checkmark-circle" size={15} color="#10b981" />
                  )}
                  {item.isSuspended && (
                    <View style={[styles.suspendBadge, { backgroundColor: "#ef444420" }]}>
                      <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600" }}>Suspended</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.email, { color: colors.mutedForeground }]}>{item.email || item.phone}</Text>
                <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || colors.primary) + "18" }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] || colors.primary }]}>
                    {item.role}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderRadius: 8 }]}
                    onPress={() => router.push({ pathname: "/admin/user-detail", params: { userId: item.id.toString() } })}
                  >
                    <Feather name="user" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  {item.role !== "admin" && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#3b82f615", borderRadius: 8 }]}
                        onPress={() => openMessageUser(item)}
                        disabled={messagingUserId === item.id}
                      >
                        {messagingUserId === item.id ? (
                          <ActivityIndicator size="small" color="#3b82f6" />
                        ) : (
                          <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          { backgroundColor: item.isSuspended ? "#10b98115" : "#ef444415", borderRadius: 8 },
                        ]}
                        onPress={() => toggleSuspend(item)}
                        disabled={unsuspending === item.id}
                      >
                        {unsuspending === item.id ? (
                          <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                          <Feather
                            name={item.isSuspended ? "user-check" : "user-x"}
                            size={16}
                            color={item.isSuspended ? "#10b981" : "#ef4444"}
                          />
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
                {search.trim() ? `No users match "${search}"` : "No users found"}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showCreateAdmin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateAdmin(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => { if (!isCreating) setShowCreateAdmin(false); }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalWrap}>
            <Pressable
              style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {}}
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconWrap, { backgroundColor: "#ef444415" }]}>
                    <Feather name="user-plus" size={20} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add New Admin</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                      This account will have full admin privileges.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowCreateAdmin(false)}
                    disabled={isCreating}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalFields}>
                  <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.foreground }]}>Full Name</Text>
                    <View style={[styles.modalInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="user" size={15} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.modalInput, { color: colors.foreground }]}
                        placeholder="e.g. Juan dela Cruz"
                        placeholderTextColor={colors.mutedForeground}
                        value={adminName}
                        onChangeText={setAdminName}
                        autoCapitalize="words"
                        editable={!isCreating}
                      />
                    </View>
                  </View>

                  <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.foreground }]}>Email Address</Text>
                    <View style={[styles.modalInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="mail" size={15} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.modalInput, { color: colors.foreground }]}
                        placeholder="admin@aozora.ph"
                        placeholderTextColor={colors.mutedForeground}
                        value={adminEmail}
                        onChangeText={setAdminEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoCorrect={false}
                        editable={!isCreating}
                      />
                    </View>
                  </View>

                  <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.foreground }]}>Password</Text>
                    <View style={[styles.modalInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="lock" size={15} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.modalInput, { color: colors.foreground }]}
                        placeholder="At least 8 characters"
                        placeholderTextColor={colors.mutedForeground}
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                        secureTextEntry={!showAdminPass}
                        editable={!isCreating}
                      />
                      <TouchableOpacity onPress={() => setShowAdminPass((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={showAdminPass ? "eye-off-outline" : "eye-outline"} size={17} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.foreground }]}>Confirm Password</Text>
                    <View style={[styles.modalInputRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Feather name="lock" size={15} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.modalInput, { color: colors.foreground }]}
                        placeholder="Re-enter password"
                        placeholderTextColor={colors.mutedForeground}
                        value={adminConfirmPassword}
                        onChangeText={setAdminConfirmPassword}
                        secureTextEntry={!showAdminConfirmPass}
                        editable={!isCreating}
                      />
                      <TouchableOpacity onPress={() => setShowAdminConfirmPass((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name={showAdminConfirmPass ? "eye-off-outline" : "eye-outline"} size={17} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.modalNotice, { backgroundColor: "#f59e0b10", borderColor: "#f59e0b30" }]}>
                  <Feather name="alert-triangle" size={13} color="#f59e0b" />
                  <Text style={{ fontSize: 12, color: "#f59e0b", flex: 1, lineHeight: 18 }}>
                    Admin accounts have full access to all platform data and management features. Share credentials securely.
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowCreateAdmin(false)}
                    disabled={isCreating}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.createBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateAdmin}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Feather name="user-plus" size={15} color="#fff" />
                        <Text style={styles.createBtnText}>Create Admin</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAdminBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "bold" },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "600" },
  email: { fontSize: 13 },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: "600" },
  suspendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalWrap: { width: "100%", maxWidth: 460 },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  modalIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  modalFields: { gap: 14, marginBottom: 16 },
  modalFieldGroup: { gap: 6 },
  modalLabel: { fontSize: 13, fontWeight: "600" },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  modalInput: { flex: 1, fontSize: 14, padding: 0 },
  modalNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600" },
  createBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 10,
    paddingVertical: 13,
  },
  createBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
