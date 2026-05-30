import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { router } from "expo-router";
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

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={LOPEZ_COORDS} showsUserLocation>
        {data?.dorms?.map((dorm) => {
          if (!dorm.latitude || !dorm.longitude) return null;
          return (
            <Marker
              key={dorm.id}
              coordinate={{ latitude: dorm.latitude, longitude: dorm.longitude }}
              pinColor={colors.primary}
            >
              <Callout onPress={() => router.push(`/dorm/${dorm.id}`)}>
                <View style={styles.callout}>
                  <Text style={[styles.calloutTitle, { color: colors.foreground }]}>{dorm.name}</Text>
                  <Text style={[styles.calloutPrice, { color: colors.primary }]}>
                    ₱{Number(dorm.monthlyRent).toLocaleString()}/mo
                  </Text>
                  <Text style={[styles.calloutTap, { color: colors.mutedForeground }]}>Tap to view</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
  callout: { padding: 10, minWidth: 140 },
  calloutTitle: { fontWeight: "bold", fontSize: 14, marginBottom: 2 },
  calloutPrice: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  calloutTap: { fontSize: 11 },
});
