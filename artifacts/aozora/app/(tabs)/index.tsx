import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Image,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { getGetDormsQueryKey, useGetDorms } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

type SortOption = "newest" | "price_asc" | "price_desc" | "rating_desc";
type GenderOption = "any" | "male" | "female";
type PricePreset = "any" | "under2k" | "2k3k" | "3k5k" | "over5k";

const SORT_LABELS: Record<SortOption, string> = {
  newest:      "Newest",
  price_asc:   "Price ↑",
  price_desc:  "Price ↓",
  rating_desc: "Top Rated",
};
const SORT_CYCLE: SortOption[] = ["newest", "price_asc", "price_desc", "rating_desc"];

const GENDER_LABELS: Record<GenderOption, string> = {
  any:    "All genders",
  male:   "Male only",
  female: "Female only",
};
const GENDER_CYCLE: GenderOption[] = ["any", "male", "female"];

const PRICE_LABELS: Record<PricePreset, string> = {
  any:      "Any price",
  under2k:  "Under ₱2k",
  "2k3k":   "₱2k – ₱3k",
  "3k5k":   "₱3k – ₱5k",
  over5k:   "₱5k+",
};
const PRICE_CYCLE: PricePreset[] = ["any", "under2k", "2k3k", "3k5k", "over5k"];

function SkeletonCard({ colors }: { colors: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <Animated.View style={[styles.skeletonCard, { backgroundColor: colors.card, opacity }]}>
      <View style={[styles.skeletonImage, { backgroundColor: colors.border }]} />
      <View style={{ padding: 16, gap: 10 }}>
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "65%" }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "45%" }]} />
        <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "30%", height: 10 }]} />
        <View style={[styles.skeletonDivider, { backgroundColor: colors.border }]} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={[styles.skeletonChip, { backgroundColor: colors.border }]} />
          <View style={[styles.skeletonChip, { backgroundColor: colors.border, width: 70 }]} />
          <View style={[styles.skeletonChip, { backgroundColor: colors.border, width: 80 }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [genderFilter, setGenderFilter] = useState<GenderOption>("any");
  const [pricePreset, setPricePreset] = useState<PricePreset>("any");

  const { data, isLoading, isError, refetch, isRefetching } = useGetDorms({
    query: {
      queryKey: getGetDormsQueryKey(),
      refetchInterval: 10_000,
      refetchOnWindowFocus: true,
    },
  });

  const hasActiveFilters = sortBy !== "newest" || genderFilter !== "any" || pricePreset !== "any";

  const filtered = useMemo(() => {
    let items: any[] = data?.dorms || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.address?.toLowerCase().includes(q) ||
          d.nearbyLandmark?.toLowerCase().includes(q)
      );
    }

    if (genderFilter === "male") {
      items = items.filter((d) => d.genderPolicy === "male" || d.genderPolicy === "any");
    } else if (genderFilter === "female") {
      items = items.filter((d) => d.genderPolicy === "female" || d.genderPolicy === "any");
    }

    if (pricePreset === "under2k")    items = items.filter((d) => d.monthlyRent < 2000);
    else if (pricePreset === "2k3k")  items = items.filter((d) => d.monthlyRent >= 2000 && d.monthlyRent <= 3000);
    else if (pricePreset === "3k5k")  items = items.filter((d) => d.monthlyRent > 3000 && d.monthlyRent <= 5000);
    else if (pricePreset === "over5k") items = items.filter((d) => d.monthlyRent > 5000);

    const sorted = [...items];
    if (sortBy === "price_asc")       sorted.sort((a, b) => a.monthlyRent - b.monthlyRent);
    else if (sortBy === "price_desc") sorted.sort((a, b) => b.monthlyRent - a.monthlyRent);
    else if (sortBy === "rating_desc") sorted.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));

    return sorted;
  }, [data, search, genderFilter, pricePreset, sortBy]);

  const totalDorms = data?.dorms?.length ?? 0;
  const isFiltered = filtered.length !== totalDorms || search.trim().length > 0;

  const cycleSort = () => {
    const idx = SORT_CYCLE.indexOf(sortBy);
    setSortBy(SORT_CYCLE[(idx + 1) % SORT_CYCLE.length]);
  };
  const cycleGender = () => {
    const idx = GENDER_CYCLE.indexOf(genderFilter);
    setGenderFilter(GENDER_CYCLE[(idx + 1) % GENDER_CYCLE.length]);
  };
  const cyclePrice = () => {
    const idx = PRICE_CYCLE.indexOf(pricePreset);
    setPricePreset(PRICE_CYCLE[(idx + 1) % PRICE_CYCLE.length]);
  };
  const clearFilters = () => {
    setSortBy("newest");
    setGenderFilter("any");
    setPricePreset("any");
    setSearch("");
  };

  const renderItem = ({ item }: { item: any }) => {
    const totalBeds = item.totalRooms * item.bedsPerRoom;
    const isAlmostFull = item.availableBeds <= 2 && item.availableBeds > 0;
    const isFull = item.availableBeds === 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/dorm/${item.id}`)}
        activeOpacity={0.92}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri:
                item.coverPhotoUrl ||
                "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=800&auto=format&fit=crop",
            }}
            style={styles.cardImage}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
          />

          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₱{item.monthlyRent.toLocaleString()}</Text>
            <Text style={styles.pricePeriod}>/mo</Text>
          </View>

          {isFull ? (
            <View style={[styles.availPill, styles.availPillFull]}>
              <Text style={styles.availPillText}>Fully booked</Text>
            </View>
          ) : isAlmostFull ? (
            <View style={[styles.availPill, styles.availPillWarning]}>
              <Feather name="alert-circle" size={11} color="#fff" />
              <Text style={styles.availPillText}>{item.availableBeds} left!</Text>
            </View>
          ) : null}

          {item.averageRating ? (
            <View style={styles.ratingBadge}>
              <Feather name="star" size={12} color="#facc15" />
              <Text style={styles.ratingText}>{item.averageRating.toFixed(1)}</Text>
              {item.totalReviews > 0 && (
                <Text style={styles.ratingCount}>({item.totalReviews})</Text>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.cardForeground }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          {item.nearbyLandmark ? (
            <View style={[styles.landmarkChip, { backgroundColor: colors.secondary }]}>
              <Feather name="navigation" size={12} color={colors.primary} />
              <Text style={[styles.landmarkText, { color: colors.accent }]} numberOfLines={1}>
                Near {item.nearbyLandmark}
              </Text>
            </View>
          ) : null}

          {item.genderPolicy && item.genderPolicy !== "any" ? (
            <View style={[styles.genderBadge, {
              backgroundColor: item.genderPolicy === "male" ? "#3b82f620" : "#ec489920",
              borderRadius: 6,
            }]}>
              <Ionicons
                name={item.genderPolicy === "male" ? "male" : "female"}
                size={11}
                color={item.genderPolicy === "male" ? "#3b82f6" : "#ec4899"}
              />
              <Text style={[styles.genderBadgeText, { color: item.genderPolicy === "male" ? "#3b82f6" : "#ec4899" }]}>
                {item.genderPolicy === "male" ? "Male Only" : "Female Only"}
              </Text>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="home" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.cardForeground }]}>{item.totalRooms}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>rooms</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Feather name="moon" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.cardForeground }]}>{item.bedsPerRoom}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                {item.bedsPerRoom === 1 ? "bed/room" : "beds/room"}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Feather
                name="check-circle"
                size={14}
                color={isFull ? colors.destructive : isAlmostFull ? "#f59e0b" : "#22c55e"}
              />
              <Text style={[styles.statValue, { color: isFull ? colors.destructive : isAlmostFull ? "#f59e0b" : "#22c55e" }]}>
                {item.availableBeds}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>available</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 40,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore</Text>
            {!isLoading && (
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                {isFiltered
                  ? `${filtered.length} of ${totalDorms} dorm${totalDorms !== 1 ? "s" : ""}`
                  : "Find the perfect dorm for you"}
              </Text>
            )}
            {isLoading && (
              <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                Finding dorms nearby…
              </Text>
            )}
          </View>
          {isOwner && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}
              onPress={() => router.push("/dorm/create")}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: 12,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, address or landmark…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: colors.border },
              sortBy !== "newest" && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={cycleSort}
            activeOpacity={0.75}
          >
            <Feather
              name="bar-chart-2"
              size={12}
              color={sortBy !== "newest" ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.chipText, { color: sortBy !== "newest" ? "#fff" : colors.foreground }]}>
              {SORT_LABELS[sortBy]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: colors.border },
              genderFilter !== "any" && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={cycleGender}
            activeOpacity={0.75}
          >
            <Ionicons
              name={genderFilter === "male" ? "male" : genderFilter === "female" ? "female" : "people"}
              size={12}
              color={genderFilter !== "any" ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.chipText, { color: genderFilter !== "any" ? "#fff" : colors.foreground }]}>
              {GENDER_LABELS[genderFilter]}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: colors.border },
              pricePreset !== "any" && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={cyclePrice}
            activeOpacity={0.75}
          >
            <Feather
              name="tag"
              size={12}
              color={pricePreset !== "any" ? "#fff" : colors.mutedForeground}
            />
            <Text style={[styles.chipText, { color: pricePreset !== "any" ? "#fff" : colors.foreground }]}>
              {PRICE_LABELS[pricePreset]}
            </Text>
          </TouchableOpacity>

          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.chip, styles.chipClear, { borderColor: colors.destructive + "60" }]}
              onPress={clearFilters}
              activeOpacity={0.75}
            >
              <Feather name="x" size={12} color={colors.destructive} />
              <Text style={[styles.chipText, { color: colors.destructive }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          renderItem={() => <SkeletonCard colors={colors} />}
          scrollEnabled={false}
        />
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Couldn't load dorms</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.secondary }]}>
                <Feather name="search" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search.trim() || hasActiveFilters ? "No matches found" : "No dorms yet"}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search.trim() || hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Check back later for new listings"}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary, borderRadius: 10 }]}
                  onPress={clearFilters}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Clear filters</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filterRow: { flexGrow: 0 },
  filterRowContent: { gap: 8, paddingBottom: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipClear: { backgroundColor: "transparent" },
  chipText: { fontSize: 13, fontWeight: "500" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorTitle: { fontSize: 16, fontWeight: "600" },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  listContent: { padding: 16, gap: 20 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageWrapper: { position: "relative", height: 200 },
  cardImage: { width: "100%", height: "100%", backgroundColor: "#e2e8f0" },
  priceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(14,165,233,0.92)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 2,
  },
  priceText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  pricePeriod: { fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  availPill: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  availPillFull: { backgroundColor: "rgba(239,68,68,0.88)" },
  availPillWarning: { backgroundColor: "rgba(245,158,11,0.88)" },
  availPillText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  ratingBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  ratingCount: { fontSize: 11, color: "rgba(255,255,255,0.75)" },
  cardBody: { padding: 16, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { fontSize: 13, flex: 1 },
  landmarkChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    marginTop: 2,
  },
  landmarkText: { fontSize: 12, fontWeight: "600" },
  genderBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    marginTop: 4,
  },
  genderBadgeText: { fontSize: 11, fontWeight: "600" },
  divider: { height: 1, marginVertical: 4 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  statValue: { fontSize: 14, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 20 },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center" },
  skeletonCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  skeletonImage: { height: 200 },
  skeletonLine: { height: 14, borderRadius: 7 },
  skeletonDivider: { height: 1, marginVertical: 2 },
  skeletonChip: { height: 22, width: 60, borderRadius: 11 },
});
