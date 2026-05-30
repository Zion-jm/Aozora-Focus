import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function DormMap() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Feather name="map" size={48} color={colors.mutedForeground} />
      <Text style={[styles.title, { color: colors.foreground }]}>Map View</Text>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Open the app on your phone to explore dorms on the map.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 40 },
  title: { fontSize: 22, fontWeight: "bold" },
  sub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
