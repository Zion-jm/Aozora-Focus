import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useGetDorms, getGetDormsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const LOPEZ_COORDS = {
  latitude: 13.8856,
  longitude: 122.2604,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Hard bounds — the map cannot be scrolled outside Lopez, Quezon
const LOPEZ_BOUNDS = {
  minLat: 13.82,
  maxLat: 13.95,
  minLng: 122.20,
  maxLng: 122.33,
  // Max zoom-out: ~0.13° ≈ covers the whole municipality comfortably
  maxDelta: 0.13,
};

function clampRegion(region: typeof LOPEZ_COORDS): typeof LOPEZ_COORDS {
  const latDelta = Math.min(region.latitudeDelta, LOPEZ_BOUNDS.maxDelta);
  const lngDelta = Math.min(region.longitudeDelta, LOPEZ_BOUNDS.maxDelta);
  const latitude = Math.max(
    LOPEZ_BOUNDS.minLat + latDelta / 2,
    Math.min(LOPEZ_BOUNDS.maxLat - latDelta / 2, region.latitude)
  );
  const longitude = Math.max(
    LOPEZ_BOUNDS.minLng + lngDelta / 2,
    Math.min(LOPEZ_BOUNDS.maxLng - lngDelta / 2, region.longitude)
  );
  return { latitude, longitude, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

type MapFilter = "all" | "available" | "under4k" | "wifi" | "ac";

const MAP_FILTERS: { key: MapFilter; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "available", label: "Available" },
  { key: "under4k",   label: "≤ ₱4k" },
  { key: "wifi",      label: "WiFi" },
  { key: "ac",        label: "AC" },
];

function getAmenities(item: any): string[] {
  try {
    return typeof item.amenities === "string" ? JSON.parse(item.amenities) : item.amenities || [];
  } catch { return []; }
}

function shortPrice(n: number): string {
  if (n >= 1000) return `₱${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `₱${n}`;
}

function pinColor(dorm: any, isSelected: boolean, primaryColor: string): string {
  if (isSelected) return primaryColor;
  if (dorm.availableBeds === 0) return "#ef4444";
  if (dorm.availableBeds <= 2) return "#f59e0b";
  return "#10b981";
}

export default function DormMap() {
  const colors = useColors();
  const mapRef = useRef<MapView>(null);
  const { data } = useGetDorms({ query: { queryKey: getGetDormsQueryKey() } });
  const [selected, setSelected] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<MapFilter>("all");
  const [region, setRegion] = useState(LOPEZ_COORDS);

  const handleRegionChangeComplete = (r: typeof LOPEZ_COORDS) => {
    const clamped = clampRegion(r);
    const needsSnap =
      Math.abs(clamped.latitude - r.latitude) > 0.0001 ||
      Math.abs(clamped.longitude - r.longitude) > 0.0001 ||
      Math.abs(clamped.latitudeDelta - r.latitudeDelta) > 0.0001;
    setRegion(clamped);
    if (needsSnap) {
      mapRef.current?.animateToRegion(clamped, 250);
    }
  };

  const allDorms = useMemo(
    () => (data?.dorms || []).filter((d: any) => d.latitude && d.longitude && d.status === "approved"),
    [data]
  );

  const filteredDorms = useMemo(() => {
    return allDorms.filter((d: any) => {
      if (activeFilter === "available") return d.availableBeds > 0;
      if (activeFilter === "under4k") return d.monthlyRent <= 4000;
      if (activeFilter === "wifi") return getAmenities(d).some(a => a.toLowerCase() === "wifi");
      if (activeFilter === "ac") return getAmenities(d).some(a => a.toLowerCase().includes("air") || a.toLowerCase() === "ac");
      return true;
    });
  }, [allDorms, activeFilter]);

  const recenter = () => {
    setRegion(LOPEZ_COORDS);
    mapRef.current?.animateToRegion(LOPEZ_COORDS, 500);
  };

  const handleDismiss = () => setSelected(null);

  const handleViewDorm = () => {
    if (selected) {
      router.push(`/dorm/${selected.id}`);
      setSelected(null);
    }
  };

  // Availability counts for filter chip badges
  const availableCount = allDorms.filter((d: any) => d.availableBeds > 0).length;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        onPress={handleDismiss}
      >
        {filteredDorms.map((dorm: any) => {
          const isSelected = selected?.id === dorm.id;
          const color = pinColor(dorm, isSelected, colors.primary);

          return (
            <Marker
              key={dorm.id}
              coordinate={{ latitude: dorm.latitude!, longitude: dorm.longitude! }}
              onPress={() => setSelected(dorm)}
            >
              <TouchableOpacity
                style={styles.markerWrap}
                onPress={() => setSelected(dorm)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.pin,
                    {
                      backgroundColor: color,
                      borderColor: color,
                      shadowColor: color,
                      transform: [{ scale: isSelected ? 1.15 : 1 }],
                    },
                  ]}
                >
                  <Ionicons name="home" size={14} color="#fff" />
                </View>
                <View style={[styles.pricePill, { backgroundColor: color }]}>
                  <Text style={styles.pricePillText}>{shortPrice(dorm.monthlyRent)}</Text>
                </View>
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {/* Filter chips floating over map */}
      <View style={styles.filterStrip} pointerEvents="box-none">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          style={styles.filterScroll}
        >
          {MAP_FILTERS.map(f => {
            const active = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>
                  {f.label}
                </Text>
                {f.key === "available" && availableCount > 0 && !active && (
                  <View style={[styles.filterBadge, { backgroundColor: "#10b981" }]}>
                    <Text style={styles.filterBadgeText}>{availableCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Re-center button */}
      <TouchableOpacity
        style={[styles.recenterBtn, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: "#000" }]}
        onPress={recenter}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Pin legend */}
      {!selected && (
        <View style={[styles.legend, { backgroundColor: colors.card + "f0", borderColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#10b981" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>≤2 beds</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>Full</Text>
          </View>
        </View>
      )}

      {/* Dorm count banner */}
      {!selected && filteredDorms.length > 0 && (
        <View style={[styles.countBanner, { backgroundColor: colors.card + "ee", borderColor: colors.border }]}>
          <Ionicons name="home-outline" size={13} color={colors.primary} />
          <Text style={[styles.countText, { color: colors.foreground }]}>
            {filteredDorms.length} dorm{filteredDorms.length !== 1 ? "s" : ""} — tap a pin to explore
          </Text>
        </View>
      )}

      {!selected && filteredDorms.length === 0 && allDorms.length > 0 && (
        <View style={[styles.countBanner, { backgroundColor: colors.card + "ee", borderColor: colors.border }]}>
          <Feather name="filter" size={13} color={colors.mutedForeground} />
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>
            No dorms match this filter
          </Text>
        </View>
      )}

      {!selected && allDorms.length === 0 && (
        <View style={[styles.countBanner, { backgroundColor: colors.card + "ee", borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>
            No approved dorms with location data yet
          </Text>
        </View>
      )}

      {/* Dismiss overlay */}
      {selected && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Dorm detail bottom sheet */}
      {selected && (() => {
        const amenities = getAmenities(selected);
        const isAvailable = selected.availableBeds > 0;
        const color = pinColor(selected, false, colors.primary);
        return (
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>

            <View style={styles.sheetBody}>
              {/* Header row: photo/icon + name + address */}
              <View style={styles.sheetTop}>
                {selected.coverPhotoUrl ? (
                  <Image
                    source={{ uri: selected.coverPhotoUrl }}
                    style={styles.sheetPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.sheetIcon, { backgroundColor: colors.primary + "18" }]}>
                    <Ionicons name="home" size={26} color={colors.primary} />
                  </View>
                )}
                <View style={styles.sheetInfo}>
                  <View style={styles.sheetNameRow}>
                    <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={2}>
                      {selected.name}
                    </Text>
                    <View style={[styles.availBadge, { backgroundColor: isAvailable ? "#10b98118" : "#ef444418" }]}>
                      <View style={[styles.availDot, { backgroundColor: color }]} />
                      <Text style={[styles.availText, { color: isAvailable ? "#10b981" : "#ef4444" }]}>
                        {isAvailable ? `${selected.availableBeds} free` : "Full"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.addressRow}>
                    <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.dormAddress, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {selected.address}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    ₱{Number(selected.monthlyRent).toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>/ month</Text>
                </View>

                {selected.averageRating ? (
                  <View style={styles.stat}>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#f59e0b" />
                      <Text style={[styles.statValue, { color: colors.foreground }]}>
                        {Number(selected.averageRating).toFixed(1)}
                      </Text>
                    </View>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>rating</Text>
                  </View>
                ) : null}

                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {selected.totalRooms}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>rooms</Text>
                </View>

                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {selected.bedsPerRoom}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>bed/room</Text>
                </View>
              </View>

              {/* Amenity tags */}
              {amenities.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                  {amenities.map((a) => (
                    <View key={a} style={[styles.tag, { backgroundColor: colors.primary + "12" }]}>
                      <Text style={[styles.tagText, { color: colors.primary }]}>{a}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[styles.viewBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewDorm}
                activeOpacity={0.85}
              >
                <Text style={styles.viewBtnText}>View Full Listing</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  // Floating filter strip at top
  filterStrip: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
  },
  filterScroll: { flexGrow: 0 },
  filterChips: { flexDirection: "row", gap: 7, paddingHorizontal: 12 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },

  // Re-center button
  recenterBtn: {
    position: "absolute",
    bottom: 200,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  // Pin legend
  legend: {
    position: "absolute",
    bottom: 200,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: "500" },

  // Pins
  markerWrap: { alignItems: "center" },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  pricePill: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: "center",
  },
  pricePillText: { fontSize: 10, fontWeight: "800", color: "#fff" },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },

  // Count banner
  countBanner: {
    position: "absolute",
    bottom: 190,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  countText: { fontSize: 13, fontWeight: "500" },

  // Bottom sheet
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    zIndex: 10,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { padding: 20, paddingTop: 22 },
  sheetTop: { flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 14, marginRight: 30 },
  sheetPhoto: { width: 64, height: 64, borderRadius: 12 },
  sheetIcon: { width: 64, height: 64, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetInfo: { flex: 1, gap: 4 },
  sheetNameRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, flexWrap: "wrap" },
  dormName: { fontSize: 16, fontWeight: "700", lineHeight: 21, flex: 1 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dormAddress: { fontSize: 12, lineHeight: 16, flex: 1 },
  divider: { height: 1, marginBottom: 14 },
  statsRow: { flexDirection: "row", gap: 20, marginBottom: 14, flexWrap: "wrap" },
  stat: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  tagsScroll: { marginBottom: 16 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginRight: 6 },
  tagText: { fontSize: 12, fontWeight: "600" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  viewBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
