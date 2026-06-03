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
import MapView, { Marker, Polygon } from "react-native-maps";
import { router } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useGetDorms, getGetDormsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

// Center of Lopez, Quezon — initial camera position showing the whole municipality
const LOPEZ_COORDS = {
  latitude: 13.860,
  longitude: 122.291,
  latitudeDelta: 0.30,
  longitudeDelta: 0.25,
};

// Real OSM municipal boundary of Lopez, Quezon (117 points from OpenStreetMap relation)
const LOPEZ_BOUNDARY = [
  { latitude: 13.72941,  longitude: 122.301072 },
  { latitude: 13.739572, longitude: 122.365409 },
  { latitude: 13.751562, longitude: 122.359846 },
  { latitude: 13.76289,  longitude: 122.363395 },
  { latitude: 13.76766,  longitude: 122.364758 },
  { latitude: 13.771375, longitude: 122.36697  },
  { latitude: 13.77547,  longitude: 122.367408 },
  { latitude: 13.77938,  longitude: 122.373935 },
  { latitude: 13.807912, longitude: 122.394346 },
  { latitude: 13.90326,  longitude: 122.390442 },
  { latitude: 13.907081, longitude: 122.385564 },
  { latitude: 13.901321, longitude: 122.376168 },
  { latitude: 13.898351, longitude: 122.372481 },
  { latitude: 13.897589, longitude: 122.369303 },
  { latitude: 13.898955, longitude: 122.369082 },
  { latitude: 13.902662, longitude: 122.368722 },
  { latitude: 13.904525, longitude: 122.36362  },
  { latitude: 13.909882, longitude: 122.360292 },
  { latitude: 13.911187, longitude: 122.353565 },
  { latitude: 13.908712, longitude: 122.347593 },
  { latitude: 13.902728, longitude: 122.345632 },
  { latitude: 13.900059, longitude: 122.346647 },
  { latitude: 13.897809, longitude: 122.340554 },
  { latitude: 13.897835, longitude: 122.334167 },
  { latitude: 13.8972,   longitude: 122.329301 },
  { latitude: 13.897908, longitude: 122.324463 },
  { latitude: 13.900161, longitude: 122.317813 },
  { latitude: 13.904598, longitude: 122.315572 },
  { latitude: 13.907302, longitude: 122.315631 },
  { latitude: 13.910151, longitude: 122.310822 },
  { latitude: 13.912131, longitude: 122.30594  },
  { latitude: 13.908225, longitude: 122.301946 },
  { latitude: 13.905432, longitude: 122.301103 },
  { latitude: 13.906807, longitude: 122.300407 },
  { latitude: 13.908661, longitude: 122.299358 },
  { latitude: 13.910738, longitude: 122.293249 },
  { latitude: 13.910803, longitude: 122.292776 },
  { latitude: 13.91162,  longitude: 122.289342 },
  { latitude: 13.915264, longitude: 122.289438 },
  { latitude: 13.916686, longitude: 122.286511 },
  { latitude: 13.921112, longitude: 122.283241 },
  { latitude: 13.924858, longitude: 122.281552 },
  { latitude: 13.927852, longitude: 122.275769 },
  { latitude: 13.923464, longitude: 122.27657  },
  { latitude: 13.926204, longitude: 122.269531 },
  { latitude: 13.92991,  longitude: 122.267066 },
  { latitude: 13.933469, longitude: 122.2645   },
  { latitude: 13.93795,  longitude: 122.26249  },
  { latitude: 13.945758, longitude: 122.261236 },
  { latitude: 13.95028,  longitude: 122.254882 },
  { latitude: 13.951472, longitude: 122.250064 },
  { latitude: 13.955148, longitude: 122.245937 },
  { latitude: 13.957671, longitude: 122.246409 },
  { latitude: 13.959309, longitude: 122.243067 },
  { latitude: 13.963707, longitude: 122.237193 },
  { latitude: 13.963629, longitude: 122.234095 },
  { latitude: 13.965323, longitude: 122.23265  },
  { latitude: 13.9648,   longitude: 122.230574 },
  { latitude: 13.966443, longitude: 122.228497 },
  { latitude: 13.966565, longitude: 122.225599 },
  { latitude: 13.973386, longitude: 122.215511 },
  { latitude: 13.982295, longitude: 122.205924 },
  { latitude: 13.990917, longitude: 122.196362 },
  { latitude: 13.990548, longitude: 122.187945 },
  { latitude: 13.988298, longitude: 122.185183 },
  { latitude: 13.984589, longitude: 122.183074 },
  { latitude: 13.916823, longitude: 122.215433 },
  { latitude: 13.901657, longitude: 122.209775 },
  { latitude: 13.90059,  longitude: 122.210816 },
  { latitude: 13.899689, longitude: 122.210005 },
  { latitude: 13.900074, longitude: 122.208852 },
  { latitude: 13.898476, longitude: 122.209035 },
  { latitude: 13.89856,  longitude: 122.208689 },
  { latitude: 13.898916, longitude: 122.207456 },
  { latitude: 13.896904, longitude: 122.206532 },
  { latitude: 13.896613, longitude: 122.20797  },
  { latitude: 13.896009, longitude: 122.207948 },
  { latitude: 13.896009, longitude: 122.206746 },
  { latitude: 13.894696, longitude: 122.207154 },
  { latitude: 13.893342, longitude: 122.206682 },
  { latitude: 13.893322, longitude: 122.205373 },
  { latitude: 13.892865, longitude: 122.204518 },
  { latitude: 13.891891, longitude: 122.204019 },
  { latitude: 13.891859, longitude: 122.202593 },
  { latitude: 13.891405, longitude: 122.201983 },
  { latitude: 13.891551, longitude: 122.20091  },
  { latitude: 13.891364, longitude: 122.199129 },
  { latitude: 13.891929, longitude: 122.197571 },
  { latitude: 13.892355, longitude: 122.196779 },
  { latitude: 13.892181, longitude: 122.195632 },
  { latitude: 13.892473, longitude: 122.194629 },
  { latitude: 13.89262,  longitude: 122.193568 },
  { latitude: 13.892042, longitude: 122.193081 },
  { latitude: 13.891199, longitude: 122.19283  },
  { latitude: 13.88975,  longitude: 122.191673 },
  { latitude: 13.888887, longitude: 122.192125 },
  { latitude: 13.887399, longitude: 122.192661 },
  { latitude: 13.886932, longitude: 122.193711 },
  { latitude: 13.886369, longitude: 122.195363 },
  { latitude: 13.885149, longitude: 122.194818 },
  { latitude: 13.885118, longitude: 122.195565 },
  { latitude: 13.883978, longitude: 122.195865 },
  { latitude: 13.883361, longitude: 122.196958 },
  { latitude: 13.882764, longitude: 122.197066 },
  { latitude: 13.882158, longitude: 122.197762 },
  { latitude: 13.882272, longitude: 122.199272 },
  { latitude: 13.881369, longitude: 122.199473 },
  { latitude: 13.880297, longitude: 122.200724 },
  { latitude: 13.879582, longitude: 122.201633 },
  { latitude: 13.878481, longitude: 122.202064 },
  { latitude: 13.877941, longitude: 122.20339  },
  { latitude: 13.876654, longitude: 122.204841 },
  { latitude: 13.876769, longitude: 122.205854 },
  { latitude: 13.875371, longitude: 122.206905 },
  { latitude: 13.872752, longitude: 122.206567 },
  { latitude: 13.848129, longitude: 122.204083 },
  { latitude: 13.77645,  longitude: 122.237923 },
];

// World-covering outer ring — everything outside LOPEZ_BOUNDARY gets the overlay
const WORLD_OUTER = [
  { latitude: 90, longitude: -180 },
  { latitude: 90, longitude: 180 },
  { latitude: -90, longitude: 180 },
  { latitude: -90, longitude: -180 },
];

// Hard bounds matching the real OSM boundary extents
const LOPEZ_BOUNDS = {
  minLat: 13.72,
  maxLat: 13.99,
  minLng: 122.18,
  maxLng: 122.40,
  // Max zoom-out: 0.30° covers the full municipality
  maxDelta: 0.32,
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
        {/* Dark overlay outside Lopez — the "cutout" effect */}
        <Polygon
          coordinates={WORLD_OUTER}
          holes={[LOPEZ_BOUNDARY]}
          fillColor="rgba(0,0,0,0.52)"
          strokeWidth={0}
        />
        {/* Glowing border around the Lopez boundary */}
        <Polygon
          coordinates={LOPEZ_BOUNDARY}
          fillColor="transparent"
          strokeColor="rgba(99,102,241,0.85)"
          strokeWidth={2.5}
        />

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
