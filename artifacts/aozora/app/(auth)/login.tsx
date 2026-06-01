import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: doLogin, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err: any) => {
        if (err?.status === 403) {
          Alert.alert(
            "Account Suspended",
            "Unable to log in, account suspended. Please contact support."
          );
        } else {
          Alert.alert("Login Failed", "Invalid email/phone or password.");
        }
      },
    },
  });

  const handleLogin = () => {
    if (!identifier || !password) return;
    doLogin({ data: { identifier, password } });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + 20, paddingTop: insets.top + 20 },
        ]}
      >
        <View style={styles.header}>
          <View
            style={[
              styles.logoWrap,
              { backgroundColor: colors.primary + "18" },
            ]}
          >
            <Feather name="home" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.primary }]}>Aozora</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Home, but smarter.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Welcome back — sign in to continue
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Email or Phone
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderRadius: colors.radius,
                },
              ]}
              placeholder="yourname@email.com or 09xxxxxxxxx"
              placeholderTextColor={colors.mutedForeground}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              Password
            </Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>
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
            onPress={handleLogin}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.buttonText, { color: colors.primaryForeground }]}
              >
                Sign In
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { color: colors.primary }]}>
                Register here
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity
          style={[
            styles.helpBtn,
            { borderColor: colors.border, borderRadius: colors.radius },
          ]}
          onPress={() => router.push("/help-center")}
          activeOpacity={0.75}
        >
          <Feather name="life-buoy" size={15} color={colors.mutedForeground} />
          <Text style={[styles.helpBtnText, { color: colors.mutedForeground }]}>
            Need help or suspended? Contact Support
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
  },
  form: {
    gap: 16,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
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
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
  },
  link: {
    fontSize: 15,
    fontWeight: "700",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  helpBtnText: {
    fontSize: 13,
  },
});
