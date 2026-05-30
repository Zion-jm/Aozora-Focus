import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  getGetFavoritesQueryKey,
  useGetFavorites,
  useRemoveFavorite,
} from "@workspace/api-client-react";

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useGetFavorites({
    query: { queryKey: getGetFavoritesQueryKey() },
  });

  const favorites = (data as any)?.favorites || [];

  const remove = useRemoveFavorite({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() }),
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Saved Dorms</Text>
        <View style={{ width: 40 }} />
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
              onPress={() => router.push(`/dorm/${item.dorm?.id || item.dormId}`)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.dorm?.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600" }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.dorm?.name || "Dorm"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => remove.mutate({ dormId: (item.dorm?.id || item.dormId).toString() })}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="heart" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardPrice, { color: colors.primary }]}>
                  ₱{Number(item.dorm?.monthlyRent || 0).toLocaleString()}/mo
                </Text>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {item.dorm?.address || "Lopez, Quezon"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="heart-outline" size={56} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved dorms</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap the heart icon on any dorm to save it here
              </Text>
              <TouchableOpacity
                style={[styles.browseBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={() => router.push("/(tabs)")}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>Browse Dorms</Text>
              </TouchableOpacity>
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
