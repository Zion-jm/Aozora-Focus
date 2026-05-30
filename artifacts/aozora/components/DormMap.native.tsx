import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
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

export default function DormMap() {
  const colors = useColors();
  const { data } = useGetDorms({ query: { queryKey: getGetDormsQueryKey() } });
  const [selected, setSelected] = useState<any>(null);

  const dorms = (data?.dorms || []).filter((d) => d.latitude && d.longitude && d.status === "approved");

  const handleMarkerPress = (dorm: any) => {
    setSelected(dorm);
  };

  const handleDismiss = () => {
    setSelected(null);
  };

  const handleViewDorm = () => {
    if (selected) {
      router.push(`/dorm/${selected.id}`);
      setSelected(null);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={LOPEZ_COORDS}
        showsUserLocation
        onPress={handleDismiss}
      >
        {dorms.map((dorm) => {
          const isSelected = selected?.id === dorm.id;
          return (
            <Marker
              key={dorm.id}
              coordinate={{ latitude: dorm.latitude!, longitude: dorm.longitude! }}
              onPress={() => handleMarkerPress(dorm)}
            >
              <TouchableOpacity
                style={styles.markerWrap}
                onPress={() => handleMarkerPress(dorm)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.pin,
                    {
                      backgroundColor: isSelected ? colors.primary : "#fff",
                      borderColor: isSelected ? colors.primary : colors.primary,
                      shadowColor: colors.primary,
                      transform: [{ scale: isSelected ? 1.2 : 1 }],
                    },
                  ]}
                >
                  <Ionicons
                    name="home"
                    size={16}
                    color={isSelected ? "#fff" : colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.pinTail,
                    { borderTopColor: isSelected ? colors.primary : colors.primary },
                  ]}
                />
              </TouchableOpacity>
            </Marker>
          );
        })}
      </MapView>

      {selected && (
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      {selected && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <View style={[styles.dormIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="home" size={26} color={colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={2}>
                  {selected.name}
                </Text>
                <Text style={[styles.dormAddress, { color: colors.mutedForeground }]} numberOfLines={2}>
                  <Feather name="map-pin" size={11} color={colors.mutedForeground} /> {selected.address}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

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
                  {selected.availableBeds}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>beds free</Text>
              </View>
            </View>

            {selected.amenities && (() => {
              try {
                const list: string[] = typeof selected.amenities === "string"
                  ? JSON.parse(selected.amenities)
                  : selected.amenities;
                if (!list.length) return null;
                return (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                    {list.slice(0, 6).map((a) => (
                      <View key={a} style={[styles.tag, { backgroundColor: colors.primary + "12" }]}>
                        <Text style={[styles.tagText, { color: colors.primary }]}>{a}</Text>
                      </View>
                    ))}
                  </ScrollView>
                );
              } catch { return null; }
            })()}

            <TouchableOpacity
              style={[styles.viewBtn, { backgroundColor: colors.primary }]}
              onPress={handleViewDorm}
              activeOpacity={0.85}
            >
              <Text style={styles.viewBtnText}>View Dorm</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!selected && dorms.length === 0 && (
        <View style={[styles.emptyBanner, { backgroundColor: colors.card + "ee", borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No approved dorms with location data yet
          </Text>
        </View>
      )}

      {!selected && dorms.length > 0 && (
        <View style={[styles.countBanner, { backgroundColor: colors.card + "ee", borderColor: colors.border }]}>
          <Ionicons name="home-outline" size={13} color={colors.primary} />
          <Text style={[styles.countText, { color: colors.foreground }]}>
            {dorms.length} dorm{dorms.length !== 1 ? "s" : ""} nearby — tap a pin to explore
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },

  markerWrap: {
    alignItems: "center",
  },
  pin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    alignSelf: "center",
    marginTop: -1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },

  card: {
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
  cardBody: { padding: 20, paddingTop: 22 },
  cardTop: { flexDirection: "row", gap: 14, alignItems: "flex-start", marginBottom: 14, marginRight: 30 },
  dormIcon: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  dormName: { fontSize: 17, fontWeight: "700", lineHeight: 22, marginBottom: 4 },
  dormAddress: { fontSize: 13, lineHeight: 18 },

  divider: { height: 1, marginBottom: 14 },

  statsRow: { flexDirection: "row", gap: 24, marginBottom: 14 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "700" },
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

  countBanner: {
    position: "absolute",
    top: 12,
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
  emptyBanner: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  emptyText: { fontSize: 13 },
});
