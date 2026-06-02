import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const { mutate: doLogin, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        setSuspended(false);
        login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        if (err?.status === 403) {
          setSuspended(true);
        } else {
          setSuspended(false);
          toast.error("Login Failed", "Invalid email or password. Please try again.");
        }
      },
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password) return;
    doLogin({ data: { identifier: email.trim(), password } });
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />

      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 24,
              paddingBottom: Math.max(insets.bottom, 16) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoShadow}>
              <LinearGradient
                colors={["#818cf8", "#4f46e5"]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="home" size={30} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>Aozora</Text>
            <Text style={styles.brandTagline}>Home, but smarter.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>Sign in to your account</Text>
            </View>

            <View style={styles.fields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputRow}>
                  <Feather
                    name="mail"
                    size={17}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#94a3b8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
                    <Text style={styles.forgotLink}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <Feather
                    name="lock"
                    size={17}
                    color="#94a3b8"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signInBtn, isPending && styles.signInBtnDisabled]}
              onPress={handleLogin}
              disabled={isPending}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#4f46e5", "#4338ca"]}
                style={styles.signInGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.signInText}>Sign In</Text>
                    <Feather name="arrow-right" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.registerLink}>Create one</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {suspended && (
            <View style={styles.suspendedBanner}>
              <View style={styles.suspendedBannerTop}>
                <Feather name="lock" size={16} color="#ef4444" />
                <Text style={styles.suspendedBannerTitle}>Account Suspended</Text>
              </View>
              <Text style={styles.suspendedBannerBody}>
                Your account has been suspended. You can appeal this decision by contacting our support team.
              </Text>
              <TouchableOpacity
                style={styles.suspendedAppealBtn}
                onPress={() => router.push("/help-center?type=appeal_suspension")}
                activeOpacity={0.85}
              >
                <Feather name="shield" size={14} color="#fff" />
                <Text style={styles.suspendedAppealBtnText}>Appeal My Suspension</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => router.push("/help-center")}
            activeOpacity={0.7}
          >
            <Feather name="life-buoy" size={14} color="rgba(255,255,255,0.45)" />
            <Text style={styles.supportText}>
              Need help or suspended? Contact Support
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  keyboardView: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },

  blob1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(99,102,241,0.12)",
    top: -100,
    right: -100,
  },
  blob2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(79,70,229,0.09)",
    bottom: 60,
    left: -70,
  },

  brand: {
    alignItems: "center",
    gap: 10,
  },
  logoShadow: {
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
  },
  logoGradient: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  brandTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.3,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 26,
    padding: 28,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 18,
  },
  cardHeader: { gap: 4 },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },

  fields: { gap: 16 },
  fieldGroup: { gap: 7 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4f46e5",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    paddingVertical: Platform.OS === "web" ? 14 : 12,
  },
  eyeBtn: { padding: 4, marginLeft: 4 },

  signInBtn: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 2,
  },
  signInBtnDisabled: { opacity: 0.7 },
  signInGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  signInText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -6,
  },
  registerText: { fontSize: 14, color: "#64748b" },
  registerLink: { fontSize: 14, fontWeight: "700", color: "#4f46e5" },

  supportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  supportText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },

  suspendedBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  suspendedBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  suspendedBannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ef4444",
  },
  suspendedBannerBody: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 19,
  },
  suspendedAppealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 2,
  },
  suspendedAppealBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
