import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";

export default function AdminLoginWeb() {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: doLogin, isPending } = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== "admin") {
          setError("Access denied. This portal is for administrators only.");
          return;
        }
        setError(null);
        await login(data.token, data.user);
        router.replace("/admin");
      },
      onError: () => {
        setError("Invalid email or password. Please try again.");
      },
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password) return;
    setError(null);
    doLogin({ data: { identifier: email.trim(), password } });
  };

  const handleKeyDown = (e: any) => {
    if (e.nativeEvent?.key === "Enter") handleLogin();
  };

  return (
    <View style={styles.root}>
      {/* Left branding panel */}
      <LinearGradient
        colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
        style={styles.left}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      >
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.leftContent}>
          <View style={styles.brandRow}>
            <LinearGradient
              colors={["#818cf8", "#4f46e5"]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="home" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.brandTextCol}>
              <Text style={styles.brandName}>Aozora Admin</Text>
              <Text style={styles.brandTagline}>Manage. Verify. Protect.</Text>
            </View>
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Admin Portal</Text>
            <Text style={styles.heroSubtitle}>
              Manage listings, verify IDs, review reports, and keep the Aozora community safe.
            </Text>
          </View>

          <View style={styles.featureList}>
            {[
              { icon: "home" as const, label: "Approve & manage dorm listings" },
              { icon: "shield" as const, label: "Review ID verifications" },
              { icon: "users" as const, label: "Manage user accounts & roles" },
              { icon: "flag" as const, label: "Handle reports & violations" },
            ].map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={styles.featureIconWrap}>
                  <Feather name={f.icon} size={15} color="#a5b4fc" />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.leftFooter}>
            © {new Date().getFullYear()} Aozora · Lopez, Quezon
          </Text>
        </View>
      </LinearGradient>

      {/* Right login panel */}
      <View style={styles.right}>
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Administrator Sign In</Text>
            <Text style={styles.formSubtitle}>
              This portal is restricted to Aozora administrators.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
                <Feather name="mail" size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@aozora.ph"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setError(null); }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  onKeyPress={handleKeyDown}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
                <Feather name="lock" size={16} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  secureTextEntry={!showPassword}
                  onKeyPress={handleKeyDown}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInBtn, (!email.trim() || !password || isPending) && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={!email.trim() || !password || isPending}
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
                  <Text style={styles.signInText}>Sign In to Admin Panel</Text>
                  <Feather name="arrow-right" size={17} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.notice}>
            <Feather name="info" size={13} color="#94a3b8" />
            <Text style={styles.noticeText}>
              Only accounts with administrator privileges can access this portal.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    minHeight: "100%" as any,
  },

  left: {
    width: 420,
    minHeight: "100%" as any,
    position: "relative",
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(99,102,241,0.12)",
    top: -100,
    right: -140,
  },
  blob2: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(79,70,229,0.08)",
    bottom: 80,
    left: -80,
  },
  leftContent: {
    flex: 1,
    padding: 48,
    justifyContent: "space-between",
    gap: 40,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandTextCol: {
    gap: 2,
  },
  logoGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.4,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.5,
  },
  heroText: {
    gap: 14,
    flex: 1,
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 46,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.58)",
    lineHeight: 26,
  },
  featureList: {
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  leftFooter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
  },

  right: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 44,
    width: "100%",
    maxWidth: 460,
    gap: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 12,
  },
  formHeader: {
    gap: 6,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 21,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    backgroundColor: "rgba(239,68,68,0.07)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 10,
    padding: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 19,
  },

  fields: { gap: 18 },
  fieldGroup: { gap: 7 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  inputRowError: {
    borderColor: "rgba(239,68,68,0.4)",
    backgroundColor: "rgba(239,68,68,0.03)",
  },
  inputIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#0f172a",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },

  signInBtn: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInBtnDisabled: { opacity: 0.6 },
  signInGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  signInText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: -8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
});
