import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ["Email", "Verify", "Reset"];

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const apiPost = async (path: string, body: Record<string, string>) => {
    const res = await fetch(`${BASE_URL}/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  };

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.warning("Required", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      toast.warning("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await apiPost("/auth/forgot-password/send-otp", { email: trimmed });
      setOtp("");
      setStep(2);
    } catch (e: any) {
      toast.error("Error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      toast.warning("Required", "Please enter the full 6-digit code.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiPost("/auth/verify-otp", {
        contact: email.trim().toLowerCase(),
        code: otp.trim(),
      });
      setVerificationToken(data.verificationToken);
      setStep(3);
    } catch (e: any) {
      toast.error("Invalid Code", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.warning("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Mismatch", "Passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      await apiPost("/auth/forgot-password/reset", {
        verificationToken,
        newPassword,
      });
      setStep(4);
    } catch (e: any) {
      toast.error("Error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.border,
      color: colors.foreground,
      backgroundColor: colors.card,
      borderRadius: colors.radius,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        {step !== 4 && (
          <TouchableOpacity
            style={[
              styles.backBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() =>
              step === 1 ? router.back() : setStep((s) => (s - 1) as Step)
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
        )}

        {/* Step indicator (not shown on success screen) */}
        {step !== 4 && (
          <View style={styles.stepRow}>
            {([1, 2, 3] as Step[]).map((s) => (
              <View key={s} style={styles.stepItem}>
                <View style={styles.stepColumn}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor:
                          step >= s ? colors.primary : colors.muted,
                      },
                    ]}
                  >
                    {step > s ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text style={styles.stepDotText}>{s}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color:
                          step >= s ? colors.primary : colors.mutedForeground,
                      },
                    ]}
                  >
                    {STEP_LABELS[s - 1]}
                  </Text>
                </View>
                {s < 3 && (
                  <View
                    style={[
                      styles.stepLine,
                      {
                        backgroundColor:
                          step > s ? colors.primary : colors.border,
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.stepIconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Feather name="lock" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Reset Password
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Enter your registered email and we'll send you a verification
                code.
              </Text>
            </View>
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  Email Address
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="yourname@email.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Send Reset Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.stepIconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Feather name="mail" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Check Your Email
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                We sent a 6-digit code to
              </Text>
              <Text style={[styles.emailLabel, { color: colors.primary }]}>
                {email.trim()}
              </Text>
            </View>
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  Verification Code
                </Text>
                <TextInput
                  style={[inputStyle, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.mutedForeground}
                  value={otp}
                  onChangeText={(t) =>
                    setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Verify Code
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: colors.border, borderRadius: colors.radius },
                ]}
                onPress={() => {
                  setStep(1);
                  setOtp("");
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.secondaryBtnText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Change email or resend
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 3: New Password ── */}
        {step === 3 && (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.stepIconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Feather name="key" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                New Password
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Choose a strong password for your account.
              </Text>
            </View>
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  New Password
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.hint,
                    {
                      color:
                        newPassword.length > 0 && newPassword.length < 8
                          ? colors.destructive
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {newPassword.length > 0 && newPassword.length < 8
                    ? `${8 - newPassword.length} more character${
                        8 - newPassword.length === 1 ? "" : "s"
                      } needed`
                    : "Minimum 8 characters"}
                </Text>
              </View>

              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  Confirm Password
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="Re-enter your new password"
                    placeholderTextColor={colors.mutedForeground}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 &&
                  confirmPassword !== newPassword && (
                    <Text style={[styles.hint, { color: colors.destructive }]}>
                      Passwords don't match
                    </Text>
                  )}
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    shadowColor: colors.primary,
                  },
                ]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text
                    style={[
                      styles.buttonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Save New Password
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <View style={styles.successContainer}>
            <View
              style={[
                styles.successIcon,
                { backgroundColor: "#10b981" + "18" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={72} color="#10b981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              Password Changed!
            </Text>
            <Text
              style={[
                styles.successSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              Your password has been updated successfully. Please log in with
              your new password.
            </Text>
            <TouchableOpacity
              style={[
                styles.button,
                styles.successBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: colors.radius,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Text
                style={[styles.buttonText, { color: colors.primaryForeground }]}
              >
                Go to Login
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },

  backBtn: {
    marginBottom: 16,
    alignSelf: "flex-start",
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    marginTop: 4,
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepColumn: { alignItems: "center", gap: 4 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 },
  stepLine: { width: 36, height: 2, marginHorizontal: 6, marginBottom: 16 },

  header: { alignItems: "center", marginBottom: 32, gap: 6 },
  stepIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.3 },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emailLabel: { fontSize: 15, fontWeight: "700", marginTop: 2 },

  form: { gap: 16 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginLeft: 2 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  otpInput: {
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    paddingVertical: 18,
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },

  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "500" },

  passwordWrapper: { position: "relative" },
  passwordInput: { paddingRight: 52 },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: { fontSize: 12, marginTop: 4, marginLeft: 2 },

  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 16,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 28, fontWeight: "800", textAlign: "center", letterSpacing: -0.3 },
  successSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  successBtn: { alignSelf: "stretch", marginTop: 8 },
});
