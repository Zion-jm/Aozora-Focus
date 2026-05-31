import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Step = 1 | 2 | 3;

export default function RegisterScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [contact, setContact] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const [verificationToken, setVerificationToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"student" | "owner">("student");

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

  const handleSendOtp = async () => {
    const trimmed = contact.trim();
    if (!trimmed) {
      Alert.alert("Required", "Please enter your email or phone number.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiPost("/auth/send-otp", { contact: trimmed });
      setDevCode(data.devCode ?? null);
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
      const data = await apiPost("/auth/verify-otp", { contact: contact.trim(), code: otp.trim() });
      setVerificationToken(data.verificationToken);
      setStep(3);
    } catch (e: any) {
      Alert.alert("Invalid Code", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "The passwords you entered don't match.");
      return;
    }
    setIsLoading(true);
    try {
      const data = await apiPost("/auth/register", {
        fullName: fullName.trim(),
        password,
        role,
        verificationToken,
      });
      login(data.token, data.user);
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message);
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
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {([1, 2, 3] as Step[]).map((s) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: step >= s ? colors.primary : colors.muted,
                  },
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

        {/* ── Step 1: Contact ── */}
        {step === 1 && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary }]}>Join Aozora</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Enter your email or phone number
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                placeholder="Email or Phone Number"
                placeholderTextColor={colors.mutedForeground}
                value={contact}
                onChangeText={setContact}
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
                    Send Verification Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
                Already have an account?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </>
        )}

        {/* ── Step 2: OTP ── */}
        {step === 2 && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary }]}>Verify Code</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Enter the 6-digit code sent to
              </Text>
              <Text style={[styles.contactLabel, { color: colors.foreground }]}>
                {contact.trim()}
              </Text>
            </View>

            {devCode && (
              <View style={[styles.devBanner, { backgroundColor: "#f59e0b18", borderColor: "#f59e0b50", borderRadius: colors.radius }]}>
                <Feather name="info" size={14} color="#b45309" />
                <Text style={styles.devBannerText}>
                  Development mode — your code is:{" "}
                  <Text style={styles.devCode}>{devCode}</Text>
                </Text>
              </View>
            )}

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
                onPress={() => { setStep(1); setDevCode(null); setOtp(""); }}
              >
                <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                <Text style={[styles.resendText, { color: colors.mutedForeground }]}>
                  Change contact or resend
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 3: Details ── */}
        {step === 3 && (
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.primary }]}>Complete Profile</Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Almost there — set up your account
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={inputStyle}
                placeholder="Full Name"
                placeholderTextColor={colors.mutedForeground}
                value={fullName}
                onChangeText={setFullName}
                autoFocus
              />

              {/* Password */}
              <View>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="Password"
                    placeholderTextColor={colors.mutedForeground}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[
                    styles.hint,
                    {
                      color: password.length > 0 && password.length < 8
                        ? colors.destructive
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {password.length > 0 && password.length < 8
                    ? `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed`
                    : "Minimum 8 characters"}
                </Text>
              </View>

              {/* Confirm Password */}
              <View>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="Confirm Password"
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
                    <Feather
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <Text style={[styles.hint, { color: colors.destructive }]}>
                    Passwords don't match
                  </Text>
                )}
              </View>

              {/* Role selector */}
              <View style={styles.roleContainer}>
                <Text style={[styles.roleLabel, { color: colors.foreground }]}>I am a:</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      { borderColor: colors.primary, borderRadius: colors.radius },
                      role === "student" && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setRole("student")}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        { color: role === "student" ? colors.primaryForeground : colors.primary },
                      ]}
                    >
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      { borderColor: colors.primary, borderRadius: colors.radius },
                      role === "owner" && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setRole("owner")}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        { color: role === "owner" ? colors.primaryForeground : colors.primary },
                      ]}
                    >
                      Dorm Owner
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                    Create Account
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

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    marginTop: 8,
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
  title: { fontSize: 32, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: "center" },
  contactLabel: { fontSize: 16, fontWeight: "700", marginTop: 4 },

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

  roleContainer: { marginVertical: 4 },
  roleLabel: { fontSize: 15, fontWeight: "500", marginBottom: 10 },
  roleButtons: { flexDirection: "row", gap: 12 },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleButtonText: { fontSize: 15, fontWeight: "600" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontSize: 16 },
  link: { fontSize: 16, fontWeight: "600" },

  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  resendText: { fontSize: 14 },

  devBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  devBannerText: { fontSize: 13, color: "#92400e", flex: 1, lineHeight: 18 },
  devCode: { fontWeight: "800", fontSize: 15, letterSpacing: 2 },
});
