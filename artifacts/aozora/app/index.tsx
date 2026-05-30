import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.primary }]}>Aozora</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Home, but smarter.</Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
  },
  tagline: {
    fontSize: 16,
    marginTop: 8,
  },
});