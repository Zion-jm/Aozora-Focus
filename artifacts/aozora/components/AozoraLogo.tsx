import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { View, StyleSheet, ViewStyle } from "react-native";

interface AozoraLogoProps {
  size?: number;
  style?: ViewStyle;
}

export function AozoraLogo({ size = 52, style }: AozoraLogoProps) {
  const iconSize = Math.round(size * 0.46);
  const borderRadius = Math.round(size * 0.28);

  return (
    <LinearGradient
      colors={["#818cf8", "#4f46e5"]}
      style={[{ width: size, height: size, borderRadius, alignItems: "center", justifyContent: "center" }, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Feather name="home" size={iconSize} color="#fff" />
    </LinearGradient>
  );
}
