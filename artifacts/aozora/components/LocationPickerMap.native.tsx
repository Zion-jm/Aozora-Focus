import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  isGeocoding?: boolean;
}

export default function LocationPickerMap({ latitude, longitude, onLocationChange, isGeocoding }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [tempLat, setTempLat] = useState(latitude);
  const [tempLng, setTempLng] = useState(longitude);
  const modalMapRef = useRef<MapView>(null);
  const prevPropsRef = useRef({ latitude, longitude });

  const handleOpen = () => {
    setTempLat(latitude);
    setTempLng(longitude);
    setOpen(true);
  };

  const handleMapPress = (e: any) => {
    setTempLat(e.nativeEvent.coordinate.latitude);
    setTempLng(e.nativeEvent.coordinate.longitude);
  };

  const handleDragEnd = (e: any) => {
    setTempLat(e.nativeEvent.coordinate.latitude);
    setTempLng(e.nativeEvent.coordinate.longitude);
  };

  const handleConfirm = () => {
    onLocationChange(tempLat, tempLng);
    setOpen(false);
  };

  useEffect(() => {
    const prev = prevPropsRef.current;
    const moved =
      Math.abs(prev.latitude - latitude) > 0.0001 ||
      Math.abs(prev.longitude - longitude) > 0.0001;
    if (moved) {
      prevPropsRef.current = { latitude, longitude };
      if (open) {
        setTempLat(latitude);
        setTempLng(longitude);
        modalMapRef.current?.animateToRegion(
          { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          600
        );
      }
    }
  }, [latitude, longitude, open]);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: isGeocoding ? colors.primary : colors.border, borderRadius: colors.radius }]}
        onPress={handleOpen}
        activeOpacity={0.85}
      >
        <MapView
          style={StyleSheet.absoluteFillObject}
          region={{
            latitude,
            longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          <Marker coordinate={{ latitude, longitude }} />
        </MapView>

        {isGeocoding ? (
          <View style={[styles.overlay, { backgroundColor: "rgba(79,70,229,0.55)" }]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.overlayLabel}>Finding location…</Text>
          </View>
        ) : (
          <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.28)" }]}>
            <Feather name="map-pin" size={20} color="#fff" />
            <Text style={styles.overlayLabel}>Tap to adjust pin</Text>
            <Text style={styles.overlayCoords}>
              {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.modalHeader,
              { paddingTop: insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.iconBtn}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Adjust Pin</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.doneBtn, { backgroundColor: colors.primary, borderRadius: 8 }]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.hintBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Feather name="move" size={13} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Drag the pin or tap the map to set the exact location
            </Text>
          </View>

          <MapView
            ref={modalMapRef}
            style={styles.fullMap}
            initialRegion={{
              latitude: tempLat,
              longitude: tempLng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onPress={handleMapPress}
            showsUserLocation
          >
            <Marker
              coordinate={{ latitude: tempLat, longitude: tempLng }}
              draggable
              onDragEnd={handleDragEnd}
            />
          </MapView>

          <View
            style={[
              styles.coordBar,
              { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 },
            ]}
          >
            <Feather name="map-pin" size={16} color={colors.primary} />
            <Text style={[styles.coordText, { color: colors.foreground }]}>
              {tempLat.toFixed(6)}, {tempLng.toFixed(6)}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    height: 160,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  overlayLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  overlayCoords: { color: "rgba(255,255,255,0.85)", fontSize: 12 },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  doneBtn: { paddingHorizontal: 18, paddingVertical: 8 },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  hintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  hintText: { fontSize: 12 },

  fullMap: { flex: 1 },

  coordBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  coordText: { fontSize: 14, fontWeight: "500" },
});
