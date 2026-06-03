import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface Props {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  isGeocoding?: boolean;
}

const LOPEZ_COORDS = {
  latitude: 13.860,
  longitude: 122.291,
  latitudeDelta: 0.30,
  longitudeDelta: 0.25,
};

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

const WORLD_OUTER = [
  { latitude: 11.0, longitude: 119.5 },
  { latitude: 16.0, longitude: 119.5 },
  { latitude: 16.0, longitude: 125.0 },
  { latitude: 11.0, longitude: 125.0 },
];

const LOPEZ_BOUNDS = {
  minLat: 13.72,
  maxLat: 13.99,
  minLng: 122.18,
  maxLng: 122.40,
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

function clampCoordinate(lat: number, lng: number): { latitude: number; longitude: number } {
  return {
    latitude: Math.max(LOPEZ_BOUNDS.minLat, Math.min(LOPEZ_BOUNDS.maxLat, lat)),
    longitude: Math.max(LOPEZ_BOUNDS.minLng, Math.min(LOPEZ_BOUNDS.maxLng, lng)),
  };
}

export default function LocationPickerMap({ latitude, longitude, onLocationChange, isGeocoding }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [tempLat, setTempLat] = useState(latitude);
  const [tempLng, setTempLng] = useState(longitude);
  const [region, setRegion] = useState(LOPEZ_COORDS);
  const modalMapRef = useRef<MapView>(null);
  const prevPropsRef = useRef({ latitude, longitude });

  const handleOpen = () => {
    setTempLat(latitude);
    setTempLng(longitude);
    const clamped = clampCoordinate(latitude, longitude);
    setRegion({ ...LOPEZ_COORDS, latitude: clamped.latitude, longitude: clamped.longitude });
    setOpen(true);
  };

  const handleMapPress = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    const clamped = clampCoordinate(lat, lng);
    setTempLat(clamped.latitude);
    setTempLng(clamped.longitude);
  };

  const handleDragEnd = (e: any) => {
    const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
    const clamped = clampCoordinate(lat, lng);
    setTempLat(clamped.latitude);
    setTempLng(clamped.longitude);
  };

  const handleRegionChangeComplete = (r: typeof LOPEZ_COORDS) => {
    const clamped = clampRegion(r);
    const needsSnap =
      Math.abs(clamped.latitude - r.latitude) > 0.0001 ||
      Math.abs(clamped.longitude - r.longitude) > 0.0001 ||
      Math.abs(clamped.latitudeDelta - r.latitudeDelta) > 0.0001;
    if (needsSnap) {
      modalMapRef.current?.animateToRegion(clamped, 200);
    }
    setRegion(clamped);
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
        const clamped = clampCoordinate(latitude, longitude);
        setTempLat(clamped.latitude);
        setTempLng(clamped.longitude);
        modalMapRef.current?.animateToRegion(
          { latitude: clamped.latitude, longitude: clamped.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
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
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Lopez, Quezon only · Drag or tap to set the exact location
            </Text>
          </View>

          <MapView
            ref={modalMapRef}
            style={styles.fullMap}
            initialRegion={region}
            onPress={handleMapPress}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
          >
            <Polygon
              coordinates={WORLD_OUTER}
              holes={[[...LOPEZ_BOUNDARY].reverse()]}
              fillColor="rgba(0,0,0,0.30)"
              strokeColor="transparent"
              strokeWidth={0}
            />
            <Polygon
              coordinates={LOPEZ_BOUNDARY}
              fillColor="transparent"
              strokeColor="rgba(99,102,241,0.85)"
              strokeWidth={2}
            />
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
