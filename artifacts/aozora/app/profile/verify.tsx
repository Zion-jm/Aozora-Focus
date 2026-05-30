import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSubmitVerification } from "@workspace/api-client-react";

const ID_TYPES = ["National ID", "Passport", "Driver's License", "PhilSys ID", "Student ID"];

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const submit = useSubmitVerification({
    mutation: {
      onSuccess: () => {
        Alert.alert(
          "Submitted!",
          "Your ID is under review. We'll notify you once it's verified.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      },
      onError: () => Alert.alert("Error", "Could not submit verification. Try again."),
    },
  });

  const verificationStatus = user?.verificationStatus;
  const isVerified = verificationStatus === "verified";
  const isPending = verificationStatus === "pending";

  const requestPermission = async (type: "camera" | "gallery") => {
    if (type === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to take a photo of your ID.");
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Photo library access is needed to select your ID image.");
        return false;
      }
    }
    return true;
  };

  const pickFromGallery = async () => {
    const ok = await requestPermission("gallery");
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 ?? null);
    }
  };

  const takePhoto = async () => {
    const ok = await requestPermission("camera");
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 ?? null);
    }
  };

  const showPickerOptions = () => {
    Alert.alert("Upload ID Photo", "Choose how you'd like to provide your ID image.", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmit = () => {
    if (!imageBase64 && !imageUri) return;
    const idImageUrl = imageBase64
      ? `data:image/jpeg;base64,${imageBase64}`
      : imageUri!;
    submit.mutate({ data: { idType: idType!, imageUrl: idImageUrl } });
  };

  const canSubmit = !!(imageUri) && !submit.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Identity Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {isVerified ? (
          <View style={[styles.statusCard, { backgroundColor: "#10b98115", borderRadius: colors.radius }]}>
            <Ionicons name="checkmark-circle" size={56} color="#10b981" />
            <Text style={[styles.statusTitle, { color: "#10b981" }]}>Identity Verified</Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              Your identity has been verified. You can now access all platform features.
            </Text>
          </View>
        ) : isPending ? (
          <View style={[styles.statusCard, { backgroundColor: "#f59e0b15", borderRadius: colors.radius }]}>
            <Feather name="clock" size={56} color="#f59e0b" />
            <Text style={[styles.statusTitle, { color: "#f59e0b" }]}>Under Review</Text>
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              Your ID is being reviewed. This usually takes 1–2 business days.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: colors.primary + "12", borderRadius: colors.radius }]}>
              <Feather name="shield" size={24} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>
                Verifying your identity builds trust with dorm owners and unlocks full access to Aozora.
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>ID Type *</Text>
            <View style={styles.idTypeList}>
              {ID_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.idTypeBtn,
                    {
                      borderColor: idType === type ? colors.primary : colors.border,
                      backgroundColor: idType === type ? colors.primary + "15" : colors.card,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => setIdType(type)}
                >
                  {idType === type
                    ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    : <View style={[styles.radioEmpty, { borderColor: colors.border }]} />
                  }
                  <Text style={[styles.idTypeName, { color: idType === type ? colors.primary : colors.foreground }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>ID Photo *</Text>

            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: imageUri }} style={[styles.previewImage, { borderRadius: colors.radius, borderColor: colors.border }]} />
                <TouchableOpacity
                  style={[styles.retakeBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
                  onPress={showPickerOptions}
                >
                  <Feather name="refresh-cw" size={15} color={colors.foreground} />
                  <Text style={[styles.retakeBtnText, { color: colors.foreground }]}>Retake / Change Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={takePhoto}
                  activeOpacity={0.8}
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="camera" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBtnTitle, { color: colors.foreground }]}>Take Photo</Text>
                  <Text style={[styles.uploadBtnSub, { color: colors.mutedForeground }]}>Use camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: colors.radius }]}
                  onPress={pickFromGallery}
                  activeOpacity={0.8}
                >
                  <View style={[styles.uploadIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="image" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBtnTitle, { color: colors.foreground }]}>From Gallery</Text>
                  <Text style={[styles.uploadBtnSub, { color: colors.mutedForeground }]}>Choose existing</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.privacyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.privacyHeader}>
                <Ionicons name="lock-closed" size={16} color={colors.mutedForeground} />
                <Text style={[styles.privacyTitle, { color: colors.foreground }]}>Data Privacy Notice</Text>
              </View>
              <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
                Your ID image is collected solely for identity verification purposes under Republic Act No. 10173 (Data Privacy Act of 2012). It will only be viewed by authorized Aozora administrators and will not be shared with third parties. Once verification is complete, your image will be retained securely for compliance purposes. By submitting, you consent to this processing of your personal data.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                !canSubmit && { opacity: 0.5 },
              ]}
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              {submit.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit for Review</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  body: { padding: 20, gap: 16 },

  statusCard: { alignItems: "center", padding: 40, gap: 16 },
  statusTitle: { fontSize: 24, fontWeight: "bold" },
  statusSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  infoText: { flex: 1, fontSize: 15, lineHeight: 22 },

  fieldLabel: { fontSize: 15, fontWeight: "600" },

  idTypeList: { gap: 8 },
  idTypeBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1.5 },
  idTypeName: { fontSize: 15, fontWeight: "500" },
  radioEmpty: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },

  uploadRow: { flexDirection: "row", gap: 12 },
  uploadBtn: { flex: 1, alignItems: "center", gap: 10, paddingVertical: 20, borderWidth: 1.5, borderStyle: "dashed" },
  uploadIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  uploadBtnTitle: { fontSize: 14, fontWeight: "700" },
  uploadBtnSub: { fontSize: 12 },

  previewWrap: { gap: 10 },
  previewImage: { width: "100%", height: 200, borderWidth: 1, resizeMode: "cover" },
  retakeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1 },
  retakeBtnText: { fontSize: 14, fontWeight: "600" },

  privacyCard: { borderWidth: 1, padding: 16, gap: 10 },
  privacyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacyTitle: { fontSize: 14, fontWeight: "700" },
  privacyText: { fontSize: 13, lineHeight: 20 },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
