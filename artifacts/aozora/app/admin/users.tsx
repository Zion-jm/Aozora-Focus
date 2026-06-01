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
import { useAuth } from "@/context/AuthContext";
import {
  getAdminGetUsersQueryKey,
  useAdminGetUsers,
  useAdminUpdateUserStatus,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const ROLE_COLOR: Record<string, string> = {
  student: "#0ea5e9",
  owner: "#8b5cf6",
  admin: "#ef4444",
};

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [messagingUserId, setMessagingUserId] = useState<number | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetUsers({
    query: { queryKey: getAdminGetUsersQueryKey() },
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
      onError: () => Alert.alert("Error", "Could not update user."),
    },
  });

  const toggleSuspend = (user: any) => {
    const action = user.isSuspended ? "unsuspend" : "suspend";
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
      `Are you sure you want to ${action} ${user.fullName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: user.isSuspended ? "default" : "destructive",
          onPress: () =>
            update.mutate({ userId: user.id, data: { isSuspended: !user.isSuspended } }),
        },
      ]
    );
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
        Alert.alert("Error", "Could not open conversation.");
        return;
      }
      const conv = await res.json();
      router.push(`/admin-conversation/${conv.id}`);
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setMessagingUserId(null);
    }
  };

  const FILTERS = ["all", "student", "owner", "admin"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSub}>View and manage platform users</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

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
                      >
                        <Feather
                          name={item.isSuspended ? "user-check" : "user-x"}
                          size={16}
                          color={item.isSuspended ? "#10b981" : "#ef4444"}
                        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 18 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
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
});
