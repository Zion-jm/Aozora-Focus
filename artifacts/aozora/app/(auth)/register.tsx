import { useState, useEffect, useRef } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type Step = 1 | 2 | 3;

const STEP_LABELS = ["Email", "Verify", "Profile"];

export default function RegisterScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendCooldown(60);
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [contact, setContact] = useState("");

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

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendOtp = async () => {
    const trimmed = contact.trim();
    if (!trimmed) {
      toast.warning("Required", "Please enter your email address.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      toast.warning(
        "Invalid Email",
        "Please enter a valid email address (e.g. yourname@gmail.com)."
      );
      return;
    }
    setIsLoading(true);
    try {
      await apiPost("/auth/send-otp", { contact: trimmed });
      setOtp("");
      startCooldown();
      setStep(2);
    } catch (e: any) {
      toast.error("Error", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    try {
      await apiPost("/auth/send-otp", { contact: contact.trim() });
      setOtp("");
      startCooldown();
      toast.success("Sent!", "A new verification code has been sent.");
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
        contact: contact.trim(),
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

  const handleRegister = async () => {
    if (!fullName.trim()) {
      toast.warning("Required", "Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      toast.warning(
        "Weak Password",
        "Password must be at least 8 characters long."
      );
      return;
    }
    if (password !== confirmPassword) {
      toast.warning("Password Mismatch", "The passwords you entered don't match.");
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
      toast.error("Registration Failed", e.message);
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

        {/* ── Step 1: Contact ── */}
        {step === 1 && (
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
                Join Aozora
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Enter your email address to get started
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
                  value={contact}
                  onChangeText={setContact}
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
                    Send Verification Code
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text
                style={[styles.footerText, { color: colors.mutedForeground }]}
              >
                Already have an account?{" "}
              </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={[styles.link, { color: colors.primary }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </Link>
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
                <Feather name="shield" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Check Your Email
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                We sent a 6-digit code to
              </Text>
              <Text
                style={[styles.contactLabel, { color: colors.primary }]}
              >
                {contact.trim()}
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
                  {
                    borderColor: resendCooldown > 0 ? colors.muted : colors.border,
                    borderRadius: colors.radius,
                    opacity: resendCooldown > 0 ? 0.6 : 1,
                  },
                ]}
                onPress={handleResendOtp}
                disabled={resendCooldown > 0 || isLoading}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={resendCooldown > 0 ? colors.muted : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.secondaryBtnText,
                    { color: resendCooldown > 0 ? colors.muted : colors.mutedForeground },
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend in 0:${String(resendCooldown).padStart(2, "0")}`
                    : "Resend Code"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => { setStep(1); setOtp(""); }}
              >
                <Text style={[styles.changeEmailText, { color: colors.mutedForeground }]}>
                  Wrong email?{" "}
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>Change it</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Step 3: Details ── */}
        {step === 3 && (
          <>
            <View style={styles.header}>
              <View
                style={[
                  styles.stepIconWrap,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Feather name="user" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                Complete Profile
              </Text>
              <Text
                style={[styles.subtitle, { color: colors.mutedForeground }]}
              >
                Almost there — set up your account
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  Full Name
                </Text>
                <TextInput
                  style={inputStyle}
                  placeholder="Juan dela Cruz"
                  placeholderTextColor={colors.mutedForeground}
                  value={fullName}
                  onChangeText={setFullName}
                  autoFocus
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text
                  style={[styles.fieldLabel, { color: colors.foreground }]}
                >
                  Password
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[inputStyle, styles.passwordInput]}
                    placeholder="At least 8 characters"
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
                        password.length > 0 && password.length < 8
                          ? colors.destructive
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {password.length > 0 && password.length < 8
                    ? `${8 - password.length} more character${
                        8 - password.length === 1 ? "" : "s"
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
                    placeholder="Re-enter your password"
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
                  confirmPassword !== password && (
                    <Text style={[styles.hint, { color: colors.destructive }]}>
                      Passwords don't match
                    </Text>
                  )}
              </View>

              <View style={styles.roleContainer}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                  I am a:
                </Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      {
                        borderColor:
                          role === "student" ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        backgroundColor:
                          role === "student"
                            ? colors.primary
                            : colors.card,
                      },
                    ]}
                    onPress={() => setRole("student")}
                  >
                    <Feather
                      name="book-open"
                      size={16}
                      color={
                        role === "student" ? "#fff" : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color:
                            role === "student"
                              ? colors.primaryForeground
                              : colors.foreground,
                        },
                      ]}
                    >
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      {
                        borderColor:
                          role === "owner" ? colors.primary : colors.border,
                        borderRadius: colors.radius,
                        backgroundColor:
                          role === "owner" ? colors.primary : colors.card,
                      },
                    ]}
                    onPress={() => setRole("owner")}
                  >
                    <Feather
                      name="home"
                      size={16}
                      color={
                        role === "owner" ? "#fff" : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color:
                            role === "owner"
                              ? colors.primaryForeground
                              : colors.foreground,
                        },
                      ]}
                    >
                      Dorm Owner
                    </Text>
                  </TouchableOpacity>
                </View>
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
                onPress={handleRegister}
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
  contactLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },

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
  changeEmailBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  changeEmailText: { fontSize: 13 },

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

  roleContainer: { gap: 8 },
  roleButtons: { flexDirection: "row", gap: 10 },
  roleButton: {
    flex: 1,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  roleButtonText: { fontSize: 15, fontWeight: "600" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { fontSize: 15 },
  link: { fontSize: 15, fontWeight: "700" },
});
