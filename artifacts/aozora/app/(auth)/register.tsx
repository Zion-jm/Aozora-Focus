import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { RegisterRequestRole, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function RegisterScreen() {
  const colors = useColors();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRequestRole>("student");

  const { mutate: doRegister, isPending } = useRegister({
    mutation: {
      onSuccess: (data) => {
        login(data.token, data.user);
        router.replace("/(tabs)");
      },
      onError: (err) => {
        Alert.alert("Registration Failed", err.message || "An error occurred");
      }
    }
  });

  const handleRegister = () => {
    if (!fullName || (!email) || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    doRegister({ data: { fullName, email, password, role } });
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20, paddingTop: insets.top + 20 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Join Aozora</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
            placeholder="Full Name"
            placeholderTextColor={colors.mutedForeground}
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
            placeholder="Email Address"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View style={styles.roleContainer}>
            <Text style={[styles.roleLabel, { color: colors.foreground }]}>I am a:</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton, 
                  { borderColor: colors.primary, borderRadius: colors.radius },
                  role === "student" && { backgroundColor: colors.primary }
                ]}
                onPress={() => setRole("student")}
              >
                <Text style={[styles.roleButtonText, { color: role === "student" ? colors.primaryForeground : colors.primary }]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton, 
                  { borderColor: colors.primary, borderRadius: colors.radius },
                  role === "owner" && { backgroundColor: colors.primary }
                ]}
                onPress={() => setRole("owner")}
              >
                <Text style={[styles.roleButtonText, { color: role === "owner" ? colors.primaryForeground : colors.primary }]}>Dorm Owner</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleRegister}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Register</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={[styles.link, { color: colors.primary }]}>Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    justifyContent: "center",
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
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
    fontSize: 16,
  },
  roleContainer: {
    marginVertical: 8,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
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
});