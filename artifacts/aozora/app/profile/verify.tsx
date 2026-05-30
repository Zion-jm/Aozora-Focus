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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSubmitVerification } from "@workspace/api-client-react";

const ID_TYPES = ["National ID", "Passport", "Driver's License", "PhilSys ID", "Student ID"];

export default function VerifyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [imageUrl, setImageUrl] = useState("");

  const submit = useSubmitVerification({
    mutation: {
      onSuccess: () => {
        Alert.alert("Submitted!", "Your ID is under review. We'll notify you once it's verified.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: () => Alert.alert("Error", "Could not submit verification. Try again."),
    },
  });

  const verificationStatus = user?.verificationStatus;
  const isVerified = verificationStatus === "verified";
  const isPending = verificationStatus === "pending";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>ID Verification</Text>
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
              Your ID is being reviewed. This usually takes 1-2 business days.
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
                  {idType === type && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                  <Text style={[styles.idTypeName, { color: idType === type ? colors.primary : colors.foreground }]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>ID Image URL *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="https://example.com/my-id.jpg"
              placeholderTextColor={colors.mutedForeground}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Upload your ID to an image hosting service and paste the link here.
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                (!imageUrl.trim()) && { opacity: 0.5 },
              ]}
              disabled={!imageUrl.trim() || submit.isPending}
              onPress={() => submit.mutate({ data: { idType, imageUrl } })}
            >
              {submit.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="upload" size={18} color="#fff" />
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
  input: { borderWidth: 1, padding: 14, fontSize: 15 },
  hint: { fontSize: 13, marginTop: -8 },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 8 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
