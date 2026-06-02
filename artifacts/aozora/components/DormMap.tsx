import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useGetDorms, getGetDormsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type PriceRange = "all" | "under3k" | "3k-5k" | "5k-8k" | "over8k";
type SortBy = "default" | "price_asc" | "price_desc" | "rating";

const PRICE_FILTERS: { key: PriceRange; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "under3k", label: "< ₱3k" },
  { key: "3k-5k",   label: "₱3k–5k" },
  { key: "5k-8k",   label: "₱5k–8k" },
  { key: "over8k",  label: "₱8k+" },
];

const COMMON_AMENITIES = ["WiFi", "Air Conditioning", "Private Bathroom", "Kitchen", "Laundry", "Parking", "Generator", "Study Area", "CCTV"];

const SORT_OPTIONS: { key: SortBy; label: string; icon: string }[] = [
  { key: "default",    label: "Default",     icon: "list" },
  { key: "price_asc",  label: "Cheapest",    icon: "trending-up" },
  { key: "price_desc", label: "Most Exp.",   icon: "trending-down" },
  { key: "rating",     label: "Top Rated",   icon: "star" },
];

function getAmenities(item: any): string[] {
  try {
    return typeof item.amenities === "string" ? JSON.parse(item.amenities) : item.amenities || [];
  } catch { return []; }
}

function shortRent(n: number): string {
  if (n >= 1000) return `₱${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `₱${n}`;
}

export default function DormMap() {
  const colors = useColors();
  const [search, setSearch] = useState("");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const { data, isLoading } = useGetDorms({ query: { queryKey: getGetDormsQueryKey() } });

  const toggleAmenity = (a: string) => {
    setSelectedAmenities(prev =>
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const filtered = useMemo(() => {
    let list = (data?.dorms || []).filter((d: any) => d.status === "approved");

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d: any) =>
        d.name?.toLowerCase().includes(q) || d.address?.toLowerCase().includes(q)
      );
    }

    if (availableOnly) list = list.filter((d: any) => d.availableBeds > 0);

    if (priceRange === "under3k") list = list.filter((d: any) => d.monthlyRent < 3000);
    else if (priceRange === "3k-5k") list = list.filter((d: any) => d.monthlyRent >= 3000 && d.monthlyRent <= 5000);
    else if (priceRange === "5k-8k") list = list.filter((d: any) => d.monthlyRent > 5000 && d.monthlyRent <= 8000);
    else if (priceRange === "over8k") list = list.filter((d: any) => d.monthlyRent > 8000);

    if (selectedAmenities.length > 0) {
      list = list.filter((d: any) => {
        const ams = getAmenities(d);
        return selectedAmenities.every(a => ams.includes(a));
      });
    }

    if (sortBy === "price_asc") list = [...list].sort((a: any, b: any) => a.monthlyRent - b.monthlyRent);
    else if (sortBy === "price_desc") list = [...list].sort((a: any, b: any) => b.monthlyRent - a.monthlyRent);
    else if (sortBy === "rating") list = [...list].sort((a: any, b: any) => (b.averageRating || 0) - (a.averageRating || 0));

    return list;
  }, [data, search, priceRange, sortBy, selectedAmenities, availableOnly]);

  const hasActiveFilters = priceRange !== "all" || selectedAmenities.length > 0 || availableOnly || search.trim().length > 0;

  const clearAll = () => {
    setSearch("");
    setPriceRange("all");
    setSelectedAmenities([]);
    setAvailableOnly(false);
    setSortBy("default");
  };

  const currentSort = SORT_OPTIONS.find(s => s.key === sortBy)!;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search dorms or address…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        {/* Sort button */}
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: sortBy !== "default" ? colors.primary : colors.card, borderColor: colors.border }]}
          onPress={() => setShowSort(v => !v)}
        >
          <Feather name={currentSort.icon as any} size={15} color={sortBy !== "default" ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={[styles.sortDropdown, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#000" }]}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortBy === opt.key && { backgroundColor: colors.primary + "12" }]}
              onPress={() => { setSortBy(opt.key); setShowSort(false); }}
            >
              <Feather name={opt.icon as any} size={14} color={sortBy === opt.key ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.sortOptionText, { color: sortBy === opt.key ? colors.primary : colors.foreground }]}>
                {opt.label}
              </Text>
              {sortBy === opt.key && <Feather name="check" size={13} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter chips row */}
      <View style={[styles.filtersSection, { borderBottomColor: colors.border }]}>
        {/* Price range */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, availableOnly && { backgroundColor: "#10b981", borderColor: "#10b981" }, !availableOnly && { borderColor: colors.border }]}
            onPress={() => setAvailableOnly(v => !v)}
          >
            <View style={[styles.availDot, { backgroundColor: availableOnly ? "#fff" : "#10b981" }]} />
            <Text style={[styles.chipText, { color: availableOnly ? "#fff" : colors.mutedForeground }]}>Available</Text>
          </TouchableOpacity>
          {PRICE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, priceRange === f.key && { backgroundColor: colors.primary, borderColor: colors.primary }, priceRange !== f.key && { borderColor: colors.border }]}
              onPress={() => setPriceRange(f.key)}
            >
              <Text style={[styles.chipText, { color: priceRange === f.key ? "#fff" : colors.mutedForeground }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Amenity chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chipRow, { paddingTop: 0, paddingBottom: 10 }]}>
          {COMMON_AMENITIES.map(a => {
            const active = selectedAmenities.includes(a);
            return (
              <TouchableOpacity
                key={a}
                style={[styles.chip, styles.amenityChip, active && { backgroundColor: colors.primary + "18", borderColor: colors.primary }, !active && { borderColor: colors.border }]}
                onPress={() => toggleAmenity(a)}
              >
                <Text style={[styles.chipText, { color: active ? colors.primary : colors.mutedForeground }]}>{a}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results bar */}
      <View style={[styles.resultsBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.resultsText, { color: colors.mutedForeground }]}>
          {isLoading ? "Loading…" : `${filtered.length} dorm${filtered.length !== 1 ? "s" : ""} found`}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
            <Feather name="x" size={12} color={colors.primary} />
            <Text style={[styles.clearText, { color: colors.primary }]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="search" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No dorms found</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Try adjusting your filters</Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearAll} style={[styles.clearAllBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.clearAllBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: any }) => {
            const amenities = getAmenities(item);
            const isAvailable = item.availableBeds > 0;

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/dorm/${item.id}`)}
                activeOpacity={0.8}
              >
                {/* Cover photo or icon */}
                {item.coverPhotoUrl ? (
                  <Image
                    source={{ uri: item.coverPhotoUrl }}
                    style={styles.coverPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.dormIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name="home" size={22} color={colors.primary} />
                  </View>
                )}

                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: isAvailable ? "#10b98115" : "#ef444415" }]}>
                      <View style={[styles.dot, { backgroundColor: isAvailable ? "#10b981" : "#ef4444" }]} />
                      <Text style={[styles.badgeText, { color: isAvailable ? "#10b981" : "#ef4444" }]}>
                        {isAvailable ? `${item.availableBeds} free` : "Full"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
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
                  </View>

                  {amenities.length > 0 && (
                    <View style={styles.tagsRow}>
                      {amenities.slice(0, 3).map((a) => (
                        <View
                          key={a}
                          style={[
                            styles.tag,
                            { backgroundColor: selectedAmenities.includes(a) ? colors.primary + "18" : colors.primary + "0d",
                              borderColor: selectedAmenities.includes(a) ? colors.primary + "50" : "transparent",
                              borderWidth: 1 },
                          ]}
                        >
                          <Text style={[styles.tagText, { color: colors.primary }]}>{a}</Text>
                        </View>
                      ))}
                      {amenities.length > 3 && (
                        <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                          +{amenities.length - 3}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sortDropdown: {
    position: "absolute",
    top: 64,
    right: 12,
    zIndex: 100,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
    minWidth: 160,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sortOptionText: { flex: 1, fontSize: 14, fontWeight: "500" },
  filtersSection: { borderBottomWidth: 1 },
  chipRow: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  amenityChip: { paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12, fontWeight: "600" },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  resultsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsText: { fontSize: 12 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearText: { fontSize: 12, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14 },
  clearAllBtn: { marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  clearAllBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  coverPhoto: { width: 58, height: 58, borderRadius: 10 },
  dormIconWrap: { width: 58, height: 58, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 4 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  dormName: { fontSize: 15, fontWeight: "700", flex: 1 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 12, flex: 1 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontSize: 14, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 13, fontWeight: "600" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 2 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: "600" },
  moreText: { fontSize: 11, alignSelf: "center" },
});
