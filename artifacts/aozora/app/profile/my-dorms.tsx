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
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  getGetMyDormListingsQueryKey,
  useGetMyDormListings,
  useDeleteDorm,
} from "@workspace/api-client-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

export default function MyDormsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useGetMyDormListings({
    query: { queryKey: getGetMyDormListingsQueryKey() },
  });

  const dorms = (data as any)?.dorms || [];

  const filtered = useMemo(() => {
    if (!search.trim()) return dorms;
    const q = search.toLowerCase();
    return dorms.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.status?.toLowerCase().includes(q)
    );
  }, [dorms, search]);

  const deleteDorm = useDeleteDorm({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetMyDormListingsQueryKey() }),
      onError: () => Alert.alert("Error", "Could not delete dorm."),
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Listings</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}
          onPress={() => router.push("/dorm/create")}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, address, or status…"
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

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load listings</Text>
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
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Image
                source={{ uri: item.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600" }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || colors.mutedForeground) + "22" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || colors.mutedForeground }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.price, { color: colors.primary }]}>
                  ₱{Number(item.monthlyRent).toLocaleString()}/mo
                </Text>
                <Text style={[styles.beds, { color: colors.mutedForeground }]}>
                  {item.availableBeds} beds available
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.secondary, borderRadius: 8 }]}
                    onPress={() => router.push(`/dorm/${item.id}`)}
                  >
                    <Feather name="eye" size={15} color={colors.foreground} />
                    <Text style={[styles.actionText, { color: colors.foreground }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderRadius: 8 }]}
                    onPress={() => router.push({ pathname: "/dorm/create", params: { edit: item.id.toString() } })}
                  >
                    <Feather name="edit-2" size={15} color={colors.primary} />
                    <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#ef444415", borderRadius: 8 }]}
                    onPress={() =>
                      Alert.alert("Delete Listing?", "This cannot be undone.", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteDorm.mutate({ dormId: item.id }),
                        },
                      ])
                    }
                  >
                    <Feather name="trash-2" size={15} color="#ef4444" />
                    <Text style={[styles.actionText, { color: "#ef4444" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name={search.trim() ? "search" : "home"} size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() ? `No results for "${search}"` : "No listings yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search.trim()
                  ? "Try a different name, address, or status"
                  : "Create your first dorm listing and start accepting students"}
              </Text>
              {!search.trim() && (
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={() => router.push("/dorm/create")}
                >
                  <Feather name="plus" size={18} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Create Listing</Text>
                </TouchableOpacity>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center" },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 16 },
  card: { borderWidth: 1, overflow: "hidden" },
  cardImage: { width: "100%", height: 140 },
  cardContent: { padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardName: { fontSize: 17, fontWeight: "600", flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  price: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  beds: { fontSize: 14, marginBottom: 12 },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  actionText: { fontSize: 13, fontWeight: "600" },
  empty: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "bold" },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
});
