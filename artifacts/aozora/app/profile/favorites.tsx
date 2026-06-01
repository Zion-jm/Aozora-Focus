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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import {
  getGetFavoritesQueryKey,
  useGetFavorites,
  useRemoveFavorite,
} from "@workspace/api-client-react";

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useGetFavorites({
    query: { queryKey: getGetFavoritesQueryKey() },
  });

  const allFavorites = (data as any)?.dorms || [];
  const favorites = useMemo(() => {
    if (!search.trim()) return allFavorites;
    const q = search.toLowerCase();
    return allFavorites.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.nearbyLandmark?.toLowerCase().includes(q)
    );
  }, [allFavorites, search]);

  const remove = useRemoveFavorite({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() }),
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Saved Dorms" />

      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search saved dorms…"
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
          <Text style={{ color: colors.destructive }}>Failed to load favorites</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
              onPress={() => router.push(`/dorm/${item.id}`)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600" }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name || "Dorm"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => remove.mutate({ dormId: item.id })}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <AntDesign name="heart" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardPrice, { color: colors.primary }]}>
                  ₱{Number(item.monthlyRent || 0).toLocaleString()}/mo
                </Text>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.address || "Lopez, Quezon"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AntDesign name="hearto" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() ? `No results for "${search}"` : "No saved dorms"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {search.trim()
                  ? "Try a different name or address"
                  : "Tap the heart icon on any dorm to save it here"}
              </Text>
              {!search.trim() && (
                <TouchableOpacity
                  style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={() => router.push("/(tabs)")}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Browse Dorms</Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 16 },
  card: { borderWidth: 1, overflow: "hidden" },
  cardImage: { width: "100%", height: 150 },
  cardContent: { padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardName: { fontSize: 17, fontWeight: "600", flex: 1, marginRight: 12 },
  cardPrice: { fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  addressText: { fontSize: 14, flex: 1 },
  empty: { paddingVertical: 80, alignItems: "center", paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: "bold" },
  emptySub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  browseBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 },
});
