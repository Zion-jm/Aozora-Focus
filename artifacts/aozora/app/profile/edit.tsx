import React, { useState, useRef, useEffect } from "react";
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
  Animated,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { ActionSheet } from "@/components/ActionSheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useUpdateProfile } from "@workspace/api-client-react";
import PhoneField, { parsePhone, buildPhone, type Country } from "@/components/PhoneField";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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

type EmailChangeStep = "idle" | "entering" | "verifying";

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName ?? "");

  const parsedPhone = parsePhone(user?.phone ?? "");
  const [phoneCountry, setPhoneCountry] = useState<Country>(parsedPhone.country);
  const [phoneNational, setPhoneNational] = useState(parsedPhone.national);

  const parsedEmergency = parsePhone(user?.emergencyContactPhone ?? "");
  const [emergencyCountry, setEmergencyCountry] = useState<Country>(parsedEmergency.country);
  const [emergencyNational, setEmergencyNational] = useState(parsedEmergency.national);

  const [birthday, setBirthday] = useState(user?.birthday ?? "");
  const [universityOrWorkplace, setUniversityOrWorkplace] = useState(
    user?.universityOrWorkplace ?? ""
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    user?.emergencyContactName ?? ""
  );
  const [bio, setBio] = useState(user?.bio ?? "");
  const [phonePublic, setPhonePublic] = useState<boolean>(!!(user as any)?.phonePublic);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [showAvatarSheet, setShowAvatarSheet] = useState(false);

  const [emailStep, setEmailStep] = useState<EmailChangeStep>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(user?.email ?? "");
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (emailTimerRef.current) clearInterval(emailTimerRef.current);
    };
  }, []);

  const startEmailCooldown = () => {
    if (emailTimerRef.current) clearInterval(emailTimerRef.current);
    setResendCooldown(60);
    emailTimerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(emailTimerRef.current!);
          emailTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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

    const fullPhone = buildPhone(phoneCountry, phoneNational);
    const fullEmergency = buildPhone(emergencyCountry, emergencyNational);

    updateProfile.mutate({
      data: {
        fullName: fullName.trim(),
        phone: fullPhone || undefined,
        avatarUrl,
        birthday: birthday || undefined,
        universityOrWorkplace: universityOrWorkplace || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: fullEmergency || undefined,
        bio: bio || undefined,
        phonePublic: phonePublic as any,
      },
    });
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail.trim()) {
      toast.warning("Email required", "Please enter your new email address.");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/email-change/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.message ?? "Could not send verification code.");
        return;
      }
      startEmailCooldown();
      setEmailStep("verifying");
      toast.success("Code Sent!", `A 6-digit code was sent to ${newEmail.trim()}.`);
    } catch {
      toast.error("Error", "Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmail = async () => {
    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      toast.warning("Invalid code", "Please enter the 6-digit code.");
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/email-change/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: newEmail.trim(), code: emailOtp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.message ?? "Verification failed. Please try again.");
        return;
      }
      if (data.user) updateUser(data.user);
      setCurrentEmail(newEmail.trim());
      setNewEmail("");
      setEmailOtp("");
      setEmailStep("idle");
      toast.success("Email Updated!", `Your login email is now ${newEmail.trim()}.`);
    } catch {
      toast.error("Error", "Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCancelEmailChange = () => {
    setEmailStep("idle");
    setNewEmail("");
    setEmailOtp("");
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
        keyboardShouldPersistTaps="handled"
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

        <Field
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          placeholder="Your full name"
          colors={colors}
        />

        <PhoneField
          label="Phone Number"
          value={buildPhone(phoneCountry, phoneNational)}
          onChange={(full) => {
            const p = parsePhone(full);
            setPhoneCountry(p.country);
            setPhoneNational(p.national);
          }}
          colors={colors}
        />

        <View
          style={[
            styles.toggleRow,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.toggleInfo}>
            <Feather
              name={phonePublic ? "eye" : "eye-off"}
              size={16}
              color={phonePublic ? "#10b981" : colors.mutedForeground}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                Show number publicly
              </Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                {phonePublic
                  ? "Your phone number is visible on your public profile"
                  : "Your phone number is hidden from your public profile"}
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

        {/* Email section */}
        <View style={styles.emailSection}>
          <View style={styles.emailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email Address</Text>
              <View style={styles.emailCurrentRow}>
                <Feather name="mail" size={14} color={colors.mutedForeground} />
                <Text style={[styles.emailCurrent, { color: colors.foreground }]}>
                  {currentEmail || "Not set"}
                </Text>
              </View>
            </View>
            {emailStep === "idle" && (
              <TouchableOpacity
                style={[styles.changeEmailBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
                onPress={() => setEmailStep("entering")}
              >
                <Feather name="edit-2" size={13} color={colors.primary} />
                <Text style={[styles.changeEmailBtnText, { color: colors.primary }]}>Change</Text>
              </TouchableOpacity>
            )}
          </View>

          {emailStep !== "idle" && (
            <View
              style={[
                styles.emailChangeCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
              ]}
            >
              {emailStep === "entering" && (
                <>
                  <View style={styles.emailStepHeader}>
                    <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepBadgeText}>1</Text>
                    </View>
                    <Text style={[styles.emailStepTitle, { color: colors.foreground }]}>
                      Enter your new email
                    </Text>
                  </View>
                  <Text style={[styles.emailStepSub, { color: colors.mutedForeground }]}>
                    We'll send a 6-digit verification code to confirm you own it.
                  </Text>
                  <TextInput
                    style={[
                      styles.emailInput,
                      { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, borderRadius: colors.radius },
                    ]}
                    placeholder="new@example.com"
                    placeholderTextColor={colors.mutedForeground}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.emailBtnRow}>
                    <TouchableOpacity
                      style={[styles.cancelSmallBtn, { borderColor: colors.border }]}
                      onPress={handleCancelEmailChange}
                    >
                      <Text style={[styles.cancelSmallText, { color: colors.mutedForeground }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendCodeBtn,
                        { backgroundColor: colors.primary },
                        emailLoading && { opacity: 0.6 },
                      ]}
                      onPress={handleSendEmailOtp}
                      disabled={emailLoading}
                    >
                      {emailLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="send" size={14} color="#fff" />
                          <Text style={styles.sendCodeBtnText}>Send Code</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {emailStep === "verifying" && (
                <>
                  <View style={styles.emailStepHeader}>
                    <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <Text style={[styles.emailStepTitle, { color: colors.foreground }]}>
                      Enter verification code
                    </Text>
                  </View>
                  <View style={styles.sentToRow}>
                    <Feather name="mail" size={13} color={colors.primary} />
                    <Text style={[styles.sentToText, { color: colors.mutedForeground }]}>
                      Code sent to{" "}
                      <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                        {newEmail}
                      </Text>
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.otpInput,
                      {
                        borderColor: colors.primary,
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderRadius: colors.radius,
                      },
                    ]}
                    placeholder="_ _ _ _ _ _"
                    placeholderTextColor={colors.mutedForeground}
                    value={emailOtp}
                    onChangeText={(t) => setEmailOtp(t.replace(/\D/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                  <View style={styles.emailBtnRow}>
                    <TouchableOpacity
                      style={[styles.cancelSmallBtn, { borderColor: colors.border }]}
                      onPress={() => setEmailStep("entering")}
                    >
                      <Feather name="arrow-left" size={13} color={colors.mutedForeground} />
                      <Text style={[styles.cancelSmallText, { color: colors.mutedForeground }]}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.sendCodeBtn,
                        { backgroundColor: "#10b981" },
                        emailLoading && { opacity: 0.6 },
                      ]}
                      onPress={handleConfirmEmail}
                      disabled={emailLoading}
                    >
                      {emailLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="check" size={14} color="#fff" />
                          <Text style={styles.sendCodeBtnText}>Confirm</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.resendRow}
                    onPress={() => {
                      if (resendCooldown > 0 || emailLoading) return;
                      handleSendEmailOtp();
                    }}
                    disabled={resendCooldown > 0 || emailLoading}
                  >
                    <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                      {resendCooldown > 0 ? (
                        <>
                          Resend in{" "}
                          <Text style={{ color: colors.mutedForeground, fontWeight: "600" }}>
                            0:{String(resendCooldown).padStart(2, "0")}
                          </Text>
                        </>
                      ) : (
                        <>
                          Didn't receive it?{" "}
                          <Text style={{ color: colors.primary, fontWeight: "600" }}>Resend code</Text>
                        </>
                      )}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {emailStep === "idle" && (
            <Text style={[styles.emailNote, { color: colors.mutedForeground }]}>
              Changing your email requires verification. Your new email will be used for login.
            </Text>
          )}
        </View>

        <Field
          label="Birthday"
          value={birthday}
          onChange={setBirthday}
          placeholder="YYYY-MM-DD (e.g. 1999-05-15)"
          colors={colors}
        />
        <Field
          label="University / Workplace"
          value={universityOrWorkplace}
          onChange={setUniversityOrWorkplace}
          placeholder="e.g. Quezon National High School"
          colors={colors}
        />
        <Field
          label="Bio"
          value={bio}
          onChange={setBio}
          placeholder="Tell others a bit about yourself..."
          multiline
          colors={colors}
        />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>
          EMERGENCY CONTACT
        </Text>

        <Field
          label="Contact Person Name"
          value={emergencyContactName}
          onChange={setEmergencyContactName}
          placeholder="e.g. Maria Dela Cruz"
          colors={colors}
        />

        <PhoneField
          label="Contact Person Phone"
          value={buildPhone(emergencyCountry, emergencyNational)}
          onChange={(full) => {
            const p = parsePhone(full);
            setEmergencyCountry(p.country);
            setEmergencyNational(p.national);
          }}
          colors={colors}
        />

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

  emailSection: { gap: 8 },
  emailHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  emailCurrentRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  emailCurrent: { fontSize: 15, fontWeight: "500" },
  changeEmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  changeEmailBtnText: { fontSize: 13, fontWeight: "600" },
  emailNote: { fontSize: 12, lineHeight: 17 },

  emailChangeCard: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  emailStepHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  emailStepTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  emailStepSub: { fontSize: 13, lineHeight: 18 },
  emailInput: {
    borderWidth: 1,
    padding: 13,
    fontSize: 15,
  },
  otpInput: {
    borderWidth: 2,
    padding: 16,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
  },
  emailBtnRow: { flexDirection: "row", gap: 10 },
  cancelSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelSmallText: { fontSize: 14, fontWeight: "600" },
  sendCodeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendCodeBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sentToRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sentToText: { fontSize: 13, flex: 1, lineHeight: 18 },
  resendRow: { alignItems: "center", paddingTop: 4 },
  resendText: { fontSize: 13 },

  infoRow: { flexDirection: "row", borderWidth: 1, overflow: "hidden" },
  infoRowItem: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  infoRowDivider: { width: 1 },
  infoRowLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  infoRowValue: { fontSize: 14, fontWeight: "700" },

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
