import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";

export default function IndexWeb() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        />
        <View style={styles.logoShadow}>
          <LinearGradient
            colors={["#818cf8", "#4f46e5"]}
            style={styles.logo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="home" size={32} color="#fff" />
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (isAuthenticated && user?.role === "admin") {
    return <Redirect href="/admin" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoShadow: {
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
