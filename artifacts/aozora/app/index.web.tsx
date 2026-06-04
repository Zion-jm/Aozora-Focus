import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { Redirect, router } from "expo-router";
import { AozoraLogo } from "@/components/AozoraLogo";

export default function IndexWeb() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        />
        <View style={styles.logoShadow}>
          <AozoraLogo size={80} />
        </View>
      </View>
    );
  }

  if (isAuthenticated && user?.role === "admin") {
    return <Redirect href="/admin" />;
  }

  if (isAuthenticated && user?.role !== "admin") {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={["#0f0e1a", "#1e1b4b", "#3730a3"]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
        />
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <View style={styles.mobileOnlyCard}>
          <AozoraLogo size={64} />
          <Text style={styles.mobileOnlyTitle}>Aozora</Text>
          <Text style={styles.mobileOnlyTagline}>Home, but smarter.</Text>

          <View style={styles.divider} />

          <View style={styles.noticeBox}>
            <Feather name="smartphone" size={22} color="#818cf8" />
            <Text style={styles.noticeTitle}>Mobile App Required</Text>
            <Text style={styles.noticeBody}>
              The Aozora web portal is exclusively for administrators.{"\n"}
              Students and owners should use the Aozora mobile app.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => {
              await logout();
              router.replace("/(auth)/login");
            }}
            activeOpacity={0.85}
          >
            <Feather name="log-out" size={15} color="#a5b4fc" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
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

  mobileOnlyCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    gap: 12,
    maxWidth: 400,
    width: "90%",
    backdropFilter: "blur(20px)" as any,
  },
  mobileOnlyTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  mobileOnlyTagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.3,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
    marginVertical: 8,
  },

  noticeBox: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  noticeTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#e0e7ff",
    letterSpacing: -0.2,
  },
  noticeBody: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 21,
  },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.3)",
    backgroundColor: "rgba(129,140,248,0.1)",
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a5b4fc",
  },
});
