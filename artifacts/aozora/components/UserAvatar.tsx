import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: object;
  userId?: number | null;
}

export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  color = "#2196F3",
  backgroundColor = "#2196F322",
  style,
  userId,
}: UserAvatarProps) {
  const { user: currentUser } = useAuth();
  const letter = (name || "?")[0]?.toUpperCase() ?? "?";
  const borderRadius = size / 2;
  const fontSize = size * 0.42;

  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={{ width: size, height: size, borderRadius }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize, fontWeight: "bold", color }}>{letter}</Text>
    </View>
  );

  if (userId) {
    const isSelf = userId === currentUser?.id;
    return (
      <TouchableOpacity
        onPress={() => isSelf ? router.push("/(tabs)/profile") : router.push(`/user/${userId}`)}
        activeOpacity={0.75}
        style={style}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return (
    <View style={style}>
      {inner}
    </View>
  );
}
