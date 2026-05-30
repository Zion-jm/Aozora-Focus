import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
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
  const [filter, setFilter] = useState("pending");

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetDorms({
    query: { queryKey: getAdminGetDormsQueryKey() },
  });

  const allDorms = (data as any)?.dorms || [];
  const dorms = allDorms.filter((d: any) => filter === "all" || d.status === filter);

  const update = useAdminUpdateDormStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetDormsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
      },
      onError: () => Alert.alert("Error", "Could not update dorm."),
    },
  });

  const handleStatus = (dorm: any, status: string) => {
    Alert.alert(
      `${status.charAt(0).toUpperCase() + status.slice(1)} Dorm?`,
      `Set "${dorm.name}" to ${status}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status.charAt(0).toUpperCase() + status.slice(1),
          onPress: () => update.mutate({ id: dorm.id.toString(), data: { status } }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dorm Approvals</Text>
        <View style={{ width: 40 }} />
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
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
