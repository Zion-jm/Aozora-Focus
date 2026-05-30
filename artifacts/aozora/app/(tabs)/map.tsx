import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import DormMap from "@/components/DormMap";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Map</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Dorms near Lopez, Quezon
        </Text>
      </View>
      <View style={styles.mapContainer}>
        <DormMap />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: "bold" },
  headerSub: { fontSize: 15, marginTop: 4 },
  mapContainer: { flex: 1 },
});
