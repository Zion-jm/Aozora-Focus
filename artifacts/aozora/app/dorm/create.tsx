import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  useCreateDorm,
  getGetMyDormListingsQueryKey,
  getGetDormsQueryKey,
} from "@workspace/api-client-react";

const AMENITY_OPTIONS = [
  "WiFi", "Air Conditioning", "Water", "Electricity", "Laundry",
  "Kitchen", "Parking", "Security", "CCTV", "Study Area",
  "Bathroom", "Comfort Room", "Lounge",
];

export default function CreateDormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("13.8856");
  const [longitude, setLongitude] = useState("122.2604");
  const [totalRooms, setTotalRooms] = useState("1");
  const [bedsPerRoom, setBedsPerRoom] = useState("1");
  const [availableBeds, setAvailableBeds] = useState("1");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };

  const create = useCreateDorm({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMyDormListingsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
        Alert.alert("Listing Created!", "Your dorm is pending admin approval.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: () => Alert.alert("Error", "Could not create listing. Try again."),
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !address.trim() || !monthlyRent) {
      Alert.alert("Missing Fields", "Please fill in name, address, and monthly rent.");
      return;
    }
    create.mutate({
      data: {
        name: name.trim(),
        description: description.trim(),
        monthlyRent: Number(monthlyRent),
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        totalRooms: Number(totalRooms),
        bedsPerRoom: Number(bedsPerRoom),
        availableBeds: Number(availableBeds),
        coverPhotoUrl: coverPhotoUrl.trim() || undefined,
        amenities: selectedAmenities,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Listing</Text>
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

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Latitude</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="13.8856"
              placeholderTextColor={colors.mutedForeground}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Longitude</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="122.2604"
              placeholderTextColor={colors.mutedForeground}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numeric"
            />
          </View>
        </View>

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

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Cover Photo URL</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
          placeholder="https://..."
          placeholderTextColor={colors.mutedForeground}
          value={coverPhotoUrl}
          onChangeText={setCoverPhotoUrl}
          autoCapitalize="none"
          keyboardType="url"
        />

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
            create.isPending && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={create.isPending}
        >
          {create.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="home" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Listing</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Your listing will be reviewed by an admin before going live.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  body: { padding: 20, gap: 12 },
  fieldLabel: { fontSize: 15, fontWeight: "600" },
  input: { borderWidth: 1, padding: 14, fontSize: 15 },
  textarea: { height: 100, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  third: { flex: 1 },
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  amenityText: { fontSize: 13, fontWeight: "500" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hint: { fontSize: 13, textAlign: "center" },
});
