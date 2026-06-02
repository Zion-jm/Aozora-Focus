import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface Props {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({ latitude, longitude, onLocationChange }: Props) {
  const colors = useColors();

  const openPreview = () => {
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Latitude</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.background,
                borderRadius: 8,
              },
            ]}
            value={isNaN(latitude) ? "" : String(latitude)}
            onChangeText={(v) => {
              const n = parseFloat(v);
              if (!isNaN(n)) onLocationChange(n, longitude);
            }}
            keyboardType="numeric"
            placeholder="13.8856"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
        <View style={styles.half}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Longitude</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.foreground,
                backgroundColor: colors.background,
                borderRadius: 8,
              },
            ]}
            value={isNaN(longitude) ? "" : String(longitude)}
            onChangeText={(v) => {
              const n = parseFloat(v);
              if (!isNaN(n)) onLocationChange(latitude, n);
            }}
            keyboardType="numeric"
            placeholder="122.2604"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>
      </View>

      <TouchableOpacity
        onPress={openPreview}
        style={[styles.previewBtn, { borderTopColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Feather name="map" size={14} color={colors.primary} />
        <Text style={[styles.previewBtnText, { color: colors.primary }]}>
          Preview on map ↗
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, padding: 12, gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1, gap: 4 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  input: { borderWidth: 1, padding: 10, fontSize: 14 },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  previewBtnText: { fontSize: 13, fontWeight: "600" },
});
