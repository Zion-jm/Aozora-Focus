import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  getAdminGetUsersQueryKey,
  useAdminGetUsers,
  useAdminUpdateUserStatus,
} from "@workspace/api-client-react";

const ROLE_COLOR: Record<string, string> = {
  student: "#0ea5e9",
  owner: "#8b5cf6",
  admin: "#ef4444",
};

export default function SuspendedUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetUsers({
    query: { queryKey: getAdminGetUsersQueryKey() },
  });

  const allUsers = (data as any)?.users || [];
  const suspended = allUsers.filter((u: any) => u.isSuspended);

  const filtered = useMemo(() => {
    if (!search.trim()) return suspended;
    const q = search.toLowerCase();
    return suspended.filter(
      (u: any) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    );
  }, [suspended, search]);

  const update = useAdminUpdateUserStatus({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminGetUsersQueryKey() }),
      onError: () => Alert.alert("Error", "Could not unsuspend user."),
    },
  });

  const handleUnsuspend = (user: any) => {
    Alert.alert(
      "Unsuspend User?",
      `Restore access for ${user.fullName}? They will be able to log in again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unsuspend",
          onPress: () => update.mutate({ userId: user.id, data: { isSuspended: false } }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Suspended Users
          </Text>
          {!isLoading && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {suspended.length} {suspended.length === 1 ? "user" : "users"} suspended
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, email, or phone…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
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
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: (ROLE_COLOR[item.role] || colors.primary) + "22" }]}>
                <Text style={[styles.avatarText, { color: ROLE_COLOR[item.role] || colors.primary }]}>
                  {(item.fullName || "U")[0].toUpperCase()}
                </Text>
              </View>

              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  {item.verificationStatus === "verified" && (
                    <Ionicons name="checkmark-circle" size={15} color="#10b981" />
                  )}
                </View>

                <Text style={[styles.email, { color: colors.mutedForeground }]}>
                  {item.email || item.phone || "—"}
                </Text>

                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLOR[item.role] || colors.primary) + "18" }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLOR[item.role] || colors.primary }]}>
                      {item.role}
                    </Text>
                  </View>
                  <View style={[styles.suspendBadge, { backgroundColor: "#ef444420" }]}>
                    <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "600" }}>Suspended</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.unsuspendBtn,
                    { backgroundColor: "#10b98115", borderRadius: 8, borderWidth: 1, borderColor: "#10b98130" },
                  ]}
                  onPress={() => handleUnsuspend(item)}
                  disabled={update.isPending}
                >
                  <Feather name="user-check" size={15} color="#10b981" />
                  <Text style={styles.unsuspendBtnText}>Unsuspend</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              {search.trim() ? (
                <>
                  <Feather name="search" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No suspended users match "{search}"
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="users" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No suspended users</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    All accounts are currently active.
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
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
  headerSub: { fontSize: 13, marginTop: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 12 },
  card: { borderWidth: 1, padding: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  avatarText: { fontSize: 20, fontWeight: "bold" },
  info: { gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  email: { fontSize: 13 },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  roleBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleText: { fontSize: 11, fontWeight: "600" },
  suspendBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: "flex-start" },
  unsuspendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    marginTop: 6,
  },
  unsuspendBtnText: { color: "#10b981", fontSize: 14, fontWeight: "600" },
  empty: { paddingVertical: 80, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center" },
});
