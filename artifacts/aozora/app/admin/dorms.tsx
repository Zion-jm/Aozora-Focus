import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import {
  getAdminGetDormsQueryKey,
  useAdminGetDorms,
  useAdminUpdateDormStatus,
  getGetDormsQueryKey,
} from "@workspace/api-client-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

const FILTERS = ["all", "pending", "approved", "rejected"];

export default function AdminDormsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetDorms({
    query: { queryKey: getAdminGetDormsQueryKey() },
  });

  const allDorms = (data as any)?.dorms || [];
  const dorms = useMemo(() => {
    const byStatus = allDorms.filter((d: any) => filter === "all" || d.status === filter);
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.owner?.fullName?.toLowerCase().includes(q)
    );
  }, [allDorms, filter, search]);

  const update = useAdminUpdateDormStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetDormsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
      },
      onError: () => toast.error("Error", "Could not update dorm."),
    },
  });

  const handleStatus = (dorm: any, status: string) => {
    showConfirm({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} Dorm?`,
      message: `Set "${dorm.name}" to ${status}?`,
      confirmLabel: status.charAt(0).toUpperCase() + status.slice(1),
      destructive: status === "rejected",
      icon: status === "approved" ? "check-circle" : "x-circle",
      onConfirm: () => update.mutate({ dormId: dorm.id, data: { status } }),
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Dorm Approvals" subtitle="Review and approve new listings" />

      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, address, or owner…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
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
            style={[styles.filterBtn, { borderRadius: 20 }, filter === f && { backgroundColor: colors.primary }]}
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
          <Text style={{ color: colors.destructive }}>Failed to load dorms</Text>
        </View>
      ) : (
        <FlatList
          data={dorms}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Image
                source={{ uri: item.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400" }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || "#64748b") + "22" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || "#64748b" }]}>{item.status}</Text>
                  </View>
                </View>
                <View style={styles.meta}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>{item.address}</Text>
                </View>
                <Text style={[styles.price, { color: colors.primary }]}>₱{Number(item.monthlyRent).toLocaleString()}/mo</Text>
                <Text style={[styles.owner, { color: colors.mutedForeground }]}>Owner: {item.owner?.fullName || "—"}</Text>

                {item.status === "pending" && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: "#10b981", borderRadius: 8 }]}
                      onPress={() => handleStatus(item, "approved")}
                    >
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { backgroundColor: "#ef4444", borderRadius: 8 }]}
                      onPress={() => handleStatus(item, "rejected")}
                    >
                      <Feather name="x" size={16} color="#fff" />
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {item.status === "approved" && (
                  <TouchableOpacity
                    style={[styles.fullBtn, { backgroundColor: "#ef444415", borderRadius: 8 }]}
                    onPress={() => handleStatus(item, "rejected")}
                  >
                    <Text style={{ color: "#ef4444", fontWeight: "600" }}>Revoke Approval</Text>
                  </TouchableOpacity>
                )}
                {item.status === "rejected" && (
                  <TouchableOpacity
                    style={[styles.fullBtn, { backgroundColor: "#10b98115", borderRadius: 8 }]}
                    onPress={() => handleStatus(item, "approved")}
                  >
                    <Text style={{ color: "#10b981", fontWeight: "600" }}>Approve</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="home" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No {filter} dorms</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 18, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 16 },
  card: { borderWidth: 1, overflow: "hidden" },
  cardImage: { width: "100%", height: 140 },
  cardContent: { padding: 14, gap: 6 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dormName: { fontSize: 17, fontWeight: "600", flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 13, flex: 1 },
  price: { fontSize: 15, fontWeight: "bold" },
  owner: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  fullBtn: { paddingVertical: 10, alignItems: "center", marginTop: 4 },
  empty: { paddingVertical: 60, alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16 },
});
