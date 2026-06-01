import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
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
      }
    }
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
      <View style={[styles.content, { paddingBottom: insets.bottom + 20, paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Aozora</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Welcome back</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
            placeholder="Email or Phone"
            placeholderTextColor={colors.mutedForeground}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                placeholder="Password"
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

            {/* Forgot password link — sits just below the password field */}
            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleLogin}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { color: colors.primary }]}>Register here</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <TouchableOpacity
          style={[styles.helpBtn, { borderColor: colors.border }]}
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
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    fontWeight: "600",
  },
  helpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  helpBtnText: {
    fontSize: 14,
  },
});
