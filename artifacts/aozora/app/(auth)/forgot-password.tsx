import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const { login } = useAuth();
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
      Alert.alert("Required", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await apiPost("/auth/forgot-password/send-otp", { email: trimmed });
      setOtp("");
      setStep(2);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Required", "Please enter the full 6-digit code.");
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
      Alert.alert("Invalid Code", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords don't match.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiPost("/auth/forgot-password/reset", {
        verificationToken,
        newPassword,
      });
      login(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Error", e.message);
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: step >= s ? colors.primary : colors.muted },
                ]}
              >
                {step > s ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={styles.stepDotText}>{s}</Text>
                )}
              </View>
              {s < 3 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: step > s ? colors.primary : colors.border },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary }]}>Reset Password</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Enter your registered email and we'll send you a verification code.
              </Text>
            </View>
            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
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
              <Text style={[styles.title, { color: colors.primary }]}>Check Your Email</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to
              </Text>
              <Text style={[styles.emailLabel, { color: colors.foreground }]}>
                {email.trim()}
              </Text>
            </View>
            <View style={styles.form}>
              <TextInput
                style={[inputStyle, styles.otpInput]}
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                    Verify Code
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendRow}
                onPress={() => { setStep(1); setOtp(""); }}
              >
                <Ionicons name="arrow-back" size={14} color={colors.mutedForeground} />
                <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
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
              <Text style={[styles.title, { color: colors.primary }]}>New Password</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Choose a strong password for your account.
              </Text>
            </View>
            <View style={styles.form}>
              {/* New password */}
              <View>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="New password"
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
                    ? `${8 - newPassword.length} more character${8 - newPassword.length === 1 ? "" : "s"} needed`
                    : "Minimum 8 characters"}
                </Text>
              </View>

              {/* Confirm password */}
              <View>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="Confirm new password"
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
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                  <Text style={[styles.hint, { color: colors.destructive }]}>
                    Passwords don't match
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                    Save & Log In
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },

  backBtn: { marginBottom: 16, alignSelf: "flex-start" },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    marginTop: 4,
  },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  stepLine: { width: 40, height: 2, marginHorizontal: 6 },

  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 30, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emailLabel: { fontSize: 15, fontWeight: "700", marginTop: 4 },

  form: { gap: 16 },
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
    marginTop: 8,
  },
  buttonText: { fontSize: 17, fontWeight: "600" },

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
  hint: { fontSize: 12, marginTop: 6, marginLeft: 2 },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  resendText: { fontSize: 14 },
});
