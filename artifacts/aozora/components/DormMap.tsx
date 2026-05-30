import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGetDorms, getGetDormsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type FilterType = "all" | "available" | "affordable";

export default function DormMap() {
  const colors = useColors();
  const [filter, setFilter] = useState<FilterType>("all");
  const { data, isLoading } = useGetDorms({ query: { queryKey: getGetDormsQueryKey() } });

  const approved = (data?.dorms || []).filter((d: any) => d.status === "approved");
  const filtered = approved.filter((d: any) => {
    if (filter === "available") return d.availableBeds > 0;
    if (filter === "affordable") return d.monthlyRent <= 4000;
    return true;
  });

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All Dorms" },
    { key: "available", label: "Available" },
    { key: "affordable", label: "≤ ₱4k/mo" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.webNote, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
        <Ionicons name="phone-portrait-outline" size={14} color={colors.primary} />
        <Text style={[styles.webNoteText, { color: colors.primary }]}>
          Interactive map available in the Expo Go app on your phone
        </Text>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterBtn,
              filter === f.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="map-pin" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No dorms found</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Try a different filter</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: any }) => {
            const amenities: string[] = (() => {
              try {
                return typeof item.amenities === "string" ? JSON.parse(item.amenities) : item.amenities || [];
              } catch { return []; }
            })();

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/dorm/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.dormIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name="home" size={22} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.availableBeds > 0 ? (
                      <View style={[styles.badge, { backgroundColor: "#10b98115" }]}>
                        <Text style={[styles.badgeText, { color: "#10b981" }]}>Available</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: "#ef444415" }]}>
                        <Text style={[styles.badgeText, { color: "#ef4444" }]}>Full</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address || "Lopez, Quezon"}
                    </Text>
                  </View>

                  <View style={styles.statsRow}>
                    <Text style={[styles.price, { color: colors.primary }]}>
                      ₱{Number(item.monthlyRent).toLocaleString()}/mo
                    </Text>
                    {item.averageRating ? (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={[styles.ratingText, { color: colors.foreground }]}>
                          {Number(item.averageRating).toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.beds, { color: colors.mutedForeground }]}>
                      {item.availableBeds} bed{item.availableBeds !== 1 ? "s" : ""} free
                    </Text>
                  </View>

                  {amenities.length > 0 && (
                    <View style={styles.tagsRow}>
                      {amenities.slice(0, 3).map((a) => (
                        <View key={a} style={[styles.tag, { backgroundColor: colors.primary + "10" }]}>
                          <Text style={[styles.tagText, { color: colors.primary }]}>{a}</Text>
                        </View>
                      ))}
                      {amenities.length > 3 && (
                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                          +{amenities.length - 3} more
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={
            <Text style={[styles.footer, { color: colors.mutedForeground }]}>
              {filtered.length} dorm{filtered.length !== 1 ? "s" : ""} in Lopez, Quezon
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  webNoteText: { fontSize: 12, fontWeight: "500", flex: 1 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "bold" },
  emptySub: { fontSize: 14 },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardLeft: {},
  dormIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  dormName: { fontSize: 15, fontWeight: "700", flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 12, flex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontSize: 14, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "600" },
  beds: { fontSize: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: "600" },
  chevron: { marginLeft: 4 },
  footer: { textAlign: "center", fontSize: 13, paddingVertical: 16 },
});
