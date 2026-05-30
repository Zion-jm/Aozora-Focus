import React from "react";
import { View, Text, Image } from "react-native";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: object;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  color = "#2196F3",
  backgroundColor = "#2196F322",
  style,
}: UserAvatarProps) {
  const letter = (name || "?")[0]?.toUpperCase() ?? "?";
  const borderRadius = size / 2;
  const fontSize = size * 0.42;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[{ width: size, height: size, borderRadius }, style]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ fontSize, fontWeight: "bold", color }}>{letter}</Text>
    </View>
  );
}
