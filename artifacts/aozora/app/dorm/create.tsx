import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import { useToast } from "@/context/ToastContext";
import LocationPickerMap from "@/components/LocationPickerMap";
import {
  useCreateDorm,
  useUpdateDorm,
  useAddDormPhoto,
  useGetDormById,
  getGetMyDormListingsQueryKey,
  getGetDormsQueryKey,
  getGetDormByIdQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const AMENITY_OPTIONS = [
  "WiFi", "Air Conditioning", "Water", "Electricity", "Laundry",
  "Kitchen", "Parking", "Security", "CCTV", "Study Area",
  "Bathroom", "Comfort Room", "Lounge",
];

interface ExistingPhoto {
  id: number;
  url: string;
  caption?: string | null;
  order: number;
  isExisting: true;
  markedForDelete?: boolean;
}

interface NewPhoto {
  uri: string;
  base64?: string | null;
  isExisting: false;
}

type PhotoItem = ExistingPhoto | NewPhoto;

export default function CreateDormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token } = useAuth();
  const { requireVerified } = useVerificationGate();
  const { toast } = useToast();

  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editId = edit ? parseInt(edit) : null;
  const isEditMode = editId !== null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [address, setAddress] = useState("");
  const [nearbyLandmark, setNearbyLandmark] = useState("");
  const [latitude, setLatitude] = useState(13.8856);
  const [longitude, setLongitude] = useState(122.2604);
  const [totalRooms, setTotalRooms] = useState("1");
  const [bedsPerRoom, setBedsPerRoom] = useState("1");
  const [availableBeds, setAvailableBeds] = useState("1");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [genderPolicy, setGenderPolicy] = useState<"any" | "male" | "female">("any");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedAddress = useRef("");

  const { data: existingDorm, isLoading: loadingDorm } = useGetDormById(
    editId!,
    { query: { enabled: isEditMode } }
  );

  useEffect(() => {
    if (!existingDorm) return;
    const d = existingDorm as any;
    setName(d.name ?? "");
    setDescription(d.description ?? "");
    setMonthlyRent(String(d.monthlyRent ?? ""));
    setAddress(d.address ?? "");
    setNearbyLandmark(d.nearbyLandmark ?? "");
    setLatitude(d.latitude ?? 13.8856);
    setLongitude(d.longitude ?? 122.2604);
    setTotalRooms(String(d.totalRooms ?? "1"));
    setBedsPerRoom(String(d.bedsPerRoom ?? "1"));
    setAvailableBeds(String(d.availableBeds ?? "1"));
    setSelectedAmenities(Array.isArray(d.amenities) ? d.amenities : []);
    setGenderPolicy(d.genderPolicy ?? "any");
    if (Array.isArray(d.photos) && d.photos.length > 0) {
      setPhotos(
        d.photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          caption: p.caption,
          order: p.order,
          isExisting: true as const,
        }))
      );
    } else if (d.coverPhotoUrl) {
      setPhotos([{
        id: -1,
        url: d.coverPhotoUrl,
        caption: null,
        order: 0,
        isExisting: true as const,
      }]);
    }
  }, [existingDorm]);

  useEffect(() => {
    const trimmed = address.trim();
    if (trimmed.length < 5 || trimmed === lastGeocodedAddress.current) return;

    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    geocodeTimer.current = setTimeout(async () => {
      setIsGeocoding(true);
      try {
        const query = encodeURIComponent(`${trimmed}, Lopez, Quezon, Philippines`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${query}`,
          { headers: { "User-Agent": "Aozora/1.0 (dorm-finder-app)" } }
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            lastGeocodedAddress.current = trimmed;
            setLatitude(lat);
            setLongitude(lng);
          }
        }
      } catch {
        // silent — map stays at previous pin
      } finally {
        setIsGeocoding(false);
      }
    }, 900);

    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    };
  }, [address]);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const pickImages = useCallback(async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.warning("Permission needed", "Allow access to your photo library to add dorm photos.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const newPhotos: NewPhoto[] = result.assets.map((asset) => ({
        uri: asset.uri,
        base64: asset.base64,
        isExisting: false as const,
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }, []);

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (!photo) return;
    if (photo.isExisting) {
      setPhotos((prev) =>
        prev.map((p, i) =>
          i === index ? { ...(p as ExistingPhoto), markedForDelete: true } : p
        )
      );
    } else {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const unremovePhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) =>
        i === index ? { ...(p as ExistingPhoto), markedForDelete: false } : p
      )
    );
  };

  const create = useCreateDorm();
  const update = useUpdateDorm();
  const addPhoto = useAddDormPhoto();

  const uploadPhotos = async (dormId: number) => {
    const toAdd = photos.filter((p) => !p.isExisting) as NewPhoto[];
    for (let i = 0; i < toAdd.length; i++) {
      const photo = toAdd[i]!;
      const url = photo.base64
        ? `data:image/jpeg;base64,${photo.base64}`
        : photo.uri;
      await addPhoto.mutateAsync({ dormId, data: { url, order: i } });
    }
  };

  const deleteRemovedPhotos = async (dormId: number) => {
    const toDelete = photos.filter(
      (p) => p.isExisting && (p as ExistingPhoto).markedForDelete && (p as ExistingPhoto).id > 0
    ) as ExistingPhoto[];
    for (const photo of toDelete) {
      await fetch(`/api/dorms/${dormId}/photos/${photo.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  };

  const handleSubmit = async () => {
    if (!isEditMode) {
      let verified = false;
      requireVerified(() => { verified = true; });
      if (!verified) return;
    }
    if (!name.trim() || !address.trim() || !monthlyRent) {
      toast.warning("Missing Fields", "Please fill in name, address, and monthly rent.");
      return;
    }

    const visiblePhotos = photos.filter(
      (p) => !(p.isExisting && (p as ExistingPhoto).markedForDelete)
    );
    const firstPhoto = visiblePhotos[0];
    const coverPhotoUrl = firstPhoto
      ? firstPhoto.isExisting
        ? (firstPhoto as ExistingPhoto).url
        : (firstPhoto as NewPhoto).base64
          ? `data:image/jpeg;base64,${(firstPhoto as NewPhoto).base64}`
          : (firstPhoto as NewPhoto).uri
      : undefined;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      monthlyRent: Number(monthlyRent),
      address: address.trim(),
      nearbyLandmark: nearbyLandmark.trim() || undefined,
      latitude,
      longitude,
      totalRooms: Number(totalRooms),
      bedsPerRoom: Number(bedsPerRoom),
      availableBeds: Number(availableBeds),
      coverPhotoUrl,
      amenities: selectedAmenities,
      genderPolicy,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode && editId) {
        await update.mutateAsync({ dormId: editId, data: payload });
        await deleteRemovedPhotos(editId);
        await uploadPhotos(editId);
        qc.invalidateQueries({ queryKey: getGetMyDormListingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormByIdQueryKey(editId) });
        toast.success("Listing Updated!", "Your changes have been saved.");
        router.back();
      } else {
        const newDorm = await create.mutateAsync({ data: payload });
        const dormId = (newDorm as any).id;
        await uploadPhotos(dormId);
        qc.invalidateQueries({ queryKey: getGetMyDormListingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
        toast.success("Listing Created!", "Your dorm is pending admin approval.");
        router.back();
      }
    } catch {
      toast.error("Error", isEditMode ? "Could not save changes. Try again." : "Could not create listing. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && loadingDorm) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const visiblePhotos = photos.filter(
    (p) => !(p.isExisting && (p as ExistingPhoto).markedForDelete)
  );
  const deletedPhotos = photos.filter(
    (p) => p.isExisting && (p as ExistingPhoto).markedForDelete
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEditMode ? "Edit Listing" : "New Listing"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Dorm Name *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="e.g. Sunshine Dormitory"
          placeholderTextColor={colors.mutedForeground}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="Describe your dorm..."
          placeholderTextColor={colors.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Monthly Rent (₱) *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="e.g. 3500"
          placeholderTextColor={colors.mutedForeground}
          value={monthlyRent}
          onChangeText={setMonthlyRent}
          keyboardType="numeric"
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Address *</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="e.g. 123 Main St, Lopez, Quezon"
          placeholderTextColor={colors.mutedForeground}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nearby Landmark</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="e.g. Near Lopez Central School, beside BDO"
          placeholderTextColor={colors.mutedForeground}
          value={nearbyLandmark}
          onChangeText={setNearbyLandmark}
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Location on Map</Text>
        <LocationPickerMap
          latitude={latitude}
          longitude={longitude}
          onLocationChange={(lat, lng) => {
            lastGeocodedAddress.current = address.trim();
            setLatitude(lat);
            setLongitude(lng);
          }}
          isGeocoding={isGeocoding}
        />

        <View style={styles.row}>
          <View style={styles.third}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Rooms</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]} value={totalRooms} onChangeText={setTotalRooms} keyboardType="numeric" />
          </View>
          <View style={styles.third}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Beds/Room</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]} value={bedsPerRoom} onChangeText={setBedsPerRoom} keyboardType="numeric" />
          </View>
          <View style={styles.third}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Available</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]} value={availableBeds} onChangeText={setAvailableBeds} keyboardType="numeric" />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Accepted Gender</Text>
        <View style={styles.row}>
          {(["any", "male", "female"] as const).map((option) => {
            const labels = { any: "Any Gender", male: "Male Only", female: "Female Only" };
            const colors2 = { any: "#6366f1", male: "#3b82f6", female: "#ec4899" };
            const isSelected = genderPolicy === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setGenderPolicy(option)}
                style={[
                  styles.genderBtn,
                  {
                    borderColor: isSelected ? colors2[option] : colors.border,
                    backgroundColor: isSelected ? colors2[option] + "18" : colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text style={[styles.genderBtnText, { color: isSelected ? colors2[option] : colors.mutedForeground }]}>
                  {labels[option]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
            Photos {visiblePhotos.length > 0 ? `(${visiblePhotos.length})` : ""}
          </Text>
          <TouchableOpacity
            style={[styles.addPhotoBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary, borderRadius: 8 }]}
            onPress={pickImages}
          >
            <Feather name="image" size={15} color={colors.primary} />
            <Text style={[styles.addPhotoBtnText, { color: colors.primary }]}>Add from Gallery</Text>
          </TouchableOpacity>
        </View>

        {visiblePhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {visiblePhotos.map((photo, idx) => {
              const photoUri = photo.isExisting ? (photo as ExistingPhoto).url : (photo as NewPhoto).uri;
              const globalIdx = photos.indexOf(photo);
              return (
                <View key={idx} style={[styles.photoThumb, { borderColor: colors.border }]}>
                  <Image source={{ uri: photoUri }} style={styles.photoThumbImg} />
                  {idx === 0 && (
                    <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => removePhoto(globalIdx)}
                  >
                    <Feather name="x" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity
              style={[styles.addPhotoThumb, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={pickImages}
            >
              <Feather name="plus" size={24} color={colors.mutedForeground} />
              <Text style={[styles.addPhotoThumbText, { color: colors.mutedForeground }]}>Add</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <TouchableOpacity
            style={[styles.photoPlaceholder, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
            onPress={pickImages}
          >
            <Feather name="camera" size={32} color={colors.mutedForeground} />
            <Text style={[styles.photoPlaceholderText, { color: colors.mutedForeground }]}>
              Tap to pick photos from gallery
            </Text>
            <Text style={[styles.photoPlaceholderSub, { color: colors.mutedForeground }]}>
              First photo becomes the cover
            </Text>
          </TouchableOpacity>
        )}

        {deletedPhotos.length > 0 && (
          <View style={[styles.deletedSection, { backgroundColor: "#ef444410", borderRadius: colors.radius }]}>
            <Text style={[styles.deletedLabel, { color: "#ef4444" }]}>
              {deletedPhotos.length} photo{deletedPhotos.length > 1 ? "s" : ""} will be removed
            </Text>
            <TouchableOpacity
              onPress={() => {
                const indices = photos
                  .map((p, i) => (p.isExisting && (p as ExistingPhoto).markedForDelete ? i : -1))
                  .filter((i) => i >= 0);
                indices.forEach((i) => unremovePhoto(i));
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Undo</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Amenities</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITY_OPTIONS.map((a) => (
            <TouchableOpacity
              key={a}
              style={[
                styles.amenityChip,
                {
                  borderColor: selectedAmenities.includes(a) ? colors.primary : colors.border,
                  backgroundColor: selectedAmenities.includes(a) ? colors.primary + "15" : colors.card,
                  borderRadius: 20,
                },
              ]}
              onPress={() => toggleAmenity(a)}
            >
              <Text style={[styles.amenityText, { color: selectedAmenities.includes(a) ? colors.primary : colors.foreground }]}>
                {a}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
            isSubmitting && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name={isEditMode ? "save" : "home"} size={18} color="#fff" />
              <Text style={styles.submitBtnText}>
                {isEditMode ? "Save Changes" : "Submit Listing"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {!isEditMode && (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Your listing will be reviewed by an admin before going live.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  body: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 15, fontWeight: "600" },
  input: { borderWidth: 1, padding: 14, fontSize: 15 },
  textarea: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  third: { flex: 1 },
  genderBtn: { flex: 1, borderWidth: 1.5, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  genderBtnText: { fontSize: 12, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addPhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  addPhotoBtnText: { fontSize: 13, fontWeight: "600" },
  photoScroll: { marginTop: 4 },
  photoThumb: { width: 100, height: 100, borderRadius: 10, marginRight: 10, borderWidth: 1, overflow: "hidden", position: "relative" },
  photoThumbImg: { width: "100%", height: "100%" },
  coverBadge: { position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 3, alignItems: "center" },
  coverBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  photoRemoveBtn: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  addPhotoThumb: { width: 100, height: 100, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoThumbText: { fontSize: 11, fontWeight: "500" },
  photoPlaceholder: { borderWidth: 1.5, borderStyle: "dashed", paddingVertical: 36, alignItems: "center", gap: 8 },
  photoPlaceholderText: { fontSize: 15, fontWeight: "500" },
  photoPlaceholderSub: { fontSize: 12 },
  deletedSection: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, marginTop: -4 },
  deletedLabel: { fontSize: 13, fontWeight: "500" },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  amenityText: { fontSize: 13, fontWeight: "500" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 13, textAlign: "center" },
});
