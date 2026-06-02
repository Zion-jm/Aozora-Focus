import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { getGetDormsQueryKey, useGetDorms } from "@workspace/api-client-react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useGetDorms({
    query: {
      queryKey: getGetDormsQueryKey(),
    },
  });

  const filtered = useMemo(() => {
    const all = data?.dorms || [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.nearbyLandmark?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: any }) => {
    const totalBeds = item.totalRooms * item.bedsPerRoom;
    const occupancyPct = totalBeds > 0 ? ((totalBeds - item.availableBeds) / totalBeds) * 100 : 0;
    const isAlmostFull = item.availableBeds <= 2 && item.availableBeds > 0;
    const isFull = item.availableBeds === 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/dorm/${item.id}`)}
        activeOpacity={0.92}
      >
        {/* Image with gradient overlay */}
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

          {/* Price badge — top-right */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              ₱{item.monthlyRent.toLocaleString()}
            </Text>
            <Text style={styles.pricePeriod}>/mo</Text>
          </View>

          {/* Availability pill — top-left */}
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

          {/* Rating — bottom-right of image */}
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

        {/* Card body */}
        <View style={styles.cardBody}>
          {/* Title */}
          <Text
            style={[styles.cardTitle, { color: colors.cardForeground }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>

          {/* Address */}
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text
              style={[styles.infoText, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.address}
            </Text>
          </View>

          {/* Nearby landmark */}
          {item.nearbyLandmark ? (
            <View style={[styles.landmarkChip, { backgroundColor: colors.secondary }]}>
              <Feather name="navigation" size={12} color={colors.primary} />
              <Text
                style={[styles.landmarkText, { color: colors.accent }]}
                numberOfLines={1}
              >
                Near {item.nearbyLandmark}
              </Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="home" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.cardForeground }]}>
                {item.totalRooms}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                rooms
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Feather name="moon" size={14} color={colors.mutedForeground} />
              <Text style={[styles.statValue, { color: colors.cardForeground }]}>
                {item.bedsPerRoom}
              </Text>
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
              <Text
                style={[
                  styles.statValue,
                  {
                    color: isFull
                      ? colors.destructive
                      : isAlmostFull
                      ? "#f59e0b"
                      : "#22c55e",
                  },
                ]}
              >
                {item.availableBeds}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                available
              </Text>
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
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Explore
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              Find your perfect dorm in Lopez
            </Text>
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
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.destructive }}>Failed to load dorms</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="search" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search.trim()
                  ? `No dorms match "${search}"`
                  : "No dorms found"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
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
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    gap: 20,
  },

  /* Card */
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  /* Image section */
  imageWrapper: {
    position: "relative",
    height: 200,
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
  },

  /* Price badge */
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
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  pricePeriod: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },

  /* Availability pills */
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
  availPillFull: {
    backgroundColor: "rgba(239,68,68,0.88)",
  },
  availPillWarning: {
    backgroundColor: "rgba(245,158,11,0.88)",
  },
  availPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  /* Rating badge */
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
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  ratingCount: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },

  /* Card body */
  cardBody: {
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },

  /* Info rows */
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },

  /* Landmark chip */
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
  landmarkText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* Divider */
  divider: {
    height: 1,
    marginVertical: 4,
  },

  /* Stats row */
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
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 20,
  },

  /* Empty */
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
