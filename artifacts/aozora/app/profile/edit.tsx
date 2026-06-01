import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Switch,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { ActionSheet } from "@/components/ActionSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useUpdateProfile } from "@workspace/api-client-react";

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  editable = true,
  colors,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  multiline?: boolean;
  editable?: boolean;
  colors: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: editable ? colors.border : colors.border + "55",
            color: editable ? colors.foreground : colors.mutedForeground,
            backgroundColor: editable ? colors.card : colors.background,
            borderRadius: colors.radius,
          },
          multiline && { height: 80, textAlignVertical: "top" },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        editable={editable}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [birthday, setBirthday] = useState(user?.birthday ?? "");
  const [universityOrWorkplace, setUniversityOrWorkplace] = useState(
    user?.universityOrWorkplace ?? ""
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    user?.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    user?.emergencyContactPhone ?? ""
  );
  const [bio, setBio] = useState(user?.bio ?? "");
  const [phonePublic, setPhonePublic] = useState<boolean>(!!(user as any)?.phonePublic);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: (data) => {
        updateUser(data);
        toast.success("Saved!", "Your profile has been updated.");
        router.back();
      },
      onError: () => toast.error("Error", "Could not save changes. Try again."),
    },
  });

  const pickAvatar = async (source: "camera" | "gallery") => {
    let result;
    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        toast.warning("Permission Required", "Camera access is needed.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.warning("Permission Required", "Photo library access is needed.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
    }
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      toast.warning("Name required", "Please enter your full name.");
      return;
    }
    const avatarUrl = avatarBase64
      ? `data:image/jpeg;base64,${avatarBase64}`
      : avatarUri ?? undefined;

    updateProfile.mutate({
      data: {
        fullName: fullName.trim(),
        phone: phone || undefined,
        avatarUrl,
        birthday: birthday || undefined,
        universityOrWorkplace: universityOrWorkplace || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        bio: bio || undefined,
        phonePublic: phonePublic as any,
      },
    });
  };

  const avatarLetter = (fullName || user?.fullName || "U")[0]?.toUpperCase() ?? "U";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setShowAvatarSheet(true)} style={styles.avatarWrap}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={[styles.avatar, { borderColor: colors.border }]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: colors.primary + "22", borderColor: colors.border },
                ]}
              >
                <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                  {avatarLetter}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.avatarEditBadge,
                { backgroundColor: colors.primary, borderColor: colors.background },
              ]}
            >
              <Feather name="camera" size={13} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.mutedForeground }]}>
            Tap to change profile photo
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          BASIC INFORMATION
        </Text>

        <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="Your full name" colors={colors} />
        <Field label="Phone Number" value={phone} onChange={setPhone} placeholder="+63 9XX XXX XXXX" keyboardType="phone-pad" colors={colors} />
        <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.toggleInfo}>
            <Feather name={phonePublic ? "eye" : "eye-off"} size={16} color={phonePublic ? "#10b981" : colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Show number publicly</Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                {phonePublic ? "Your phone number is visible on your public profile" : "Your phone number is hidden from your public profile"}
              </Text>
            </View>
          </View>
          <Switch
            value={phonePublic}
            onValueChange={setPhonePublic}
            trackColor={{ false: colors.border, true: "#10b981" }}
            thumbColor="#fff"
          />
        </View>
        <Field
          label="Email Address"
          value={user?.email ?? ""}
          placeholder="Not set"
          editable={false}
          colors={colors}
        />
        <Field label="Birthday" value={birthday} onChange={setBirthday} placeholder="YYYY-MM-DD (e.g. 1999-05-15)" colors={colors} />
        <Field label="University / Workplace" value={universityOrWorkplace} onChange={setUniversityOrWorkplace} placeholder="e.g. Quezon National High School" colors={colors} />
        <Field label="Bio" value={bio} onChange={setBio} placeholder="Tell others a bit about yourself..." multiline colors={colors} />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>
          EMERGENCY CONTACT
        </Text>

        <Field label="Contact Person Name" value={emergencyContactName} onChange={setEmergencyContactName} placeholder="e.g. Maria Dela Cruz" colors={colors} />
        <Field label="Contact Person Phone" value={emergencyContactPhone} onChange={setEmergencyContactPhone} placeholder="+63 9XX XXX XXXX" keyboardType="phone-pad" colors={colors} />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>
          ACCOUNT INFO
        </Text>

        <View
          style={[
            styles.infoRow,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.infoRowItem}>
            <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>Role</Text>
            <Text style={[styles.infoRowValue, { color: colors.foreground }]}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "—"}
            </Text>
          </View>
          <View style={[styles.infoRowDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRowItem}>
            <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>
              Verification
            </Text>
            <Text
              style={[
                styles.infoRowValue,
                {
                  color:
                    user?.verificationStatus === "verified"
                      ? "#10b981"
                      : user?.verificationStatus === "pending"
                      ? "#f59e0b"
                      : user?.verificationStatus === "rejected"
                      ? "#ef4444"
                      : colors.mutedForeground,
                },
              ]}
            >
              {user?.verificationStatus === "verified"
                ? "Verified"
                : user?.verificationStatus === "pending"
                ? "Pending"
                : user?.verificationStatus === "rejected"
                ? "Rejected"
                : "Unverified"}
            </Text>
          </View>
          <View style={[styles.infoRowDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRowItem}>
            <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>Member since</Text>
            <Text style={[styles.infoRowValue, { color: colors.foreground }]}>
              {user?.createdAt ? new Date(user.createdAt).getFullYear().toString() : "—"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.saveFooterBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius },
            updateProfile.isPending && { opacity: 0.5 },
          ]}
          disabled={updateProfile.isPending}
          onPress={handleSave}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveFooterBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <ActionSheet
        visible={showAvatarSheet}
        title="Change Profile Photo"
        message="Choose a source:"
        items={[
          { label: "Take Photo", icon: "camera" as const, onPress: () => pickAvatar("camera") },
          { label: "Choose from Gallery", icon: "image" as const, onPress: () => pickAvatar("gallery") },
        ]}
        onClose={() => setShowAvatarSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { fontSize: 16, fontWeight: "700" },

  body: { padding: 20, gap: 14 },

  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatarWrap: { position: "relative" },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 40, fontWeight: "bold" },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHint: { fontSize: 13 },

  sectionTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginTop: 4 },

  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, padding: 13, fontSize: 15 },

  infoRow: { flexDirection: "row", borderWidth: 1, overflow: "hidden" },
  infoRowItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  infoRowDivider: { width: 1 },
  infoRowLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  infoRowValue: { fontSize: 14, fontWeight: "700" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 12,
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleSub: { fontSize: 12, marginTop: 1 },

  saveFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveFooterBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
