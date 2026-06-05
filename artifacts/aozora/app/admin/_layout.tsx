import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAdminGetStats, getAdminGetStatsQueryKey } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

function badge(n: number | undefined): number | undefined {
  return n && n > 0 ? n : undefined;
}

export default function AdminLayout() {
  const colors = useColors();
  const { data } = useAdminGetStats({
    query: { queryKey: getAdminGetStatsQueryKey(), refetchInterval: 8_000 },
  });
  const s = data as any;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          ...(Platform.OS === "web" ? { height: 60 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 4,
        },
        tabBarBadgeStyle: {
          backgroundColor: "#ef4444",
          fontSize: 10,
          minWidth: 16,
          height: 16,
          lineHeight: 16,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dorms"
        options={{
          title: "Listings",
          tabBarBadge: badge(s?.pendingDorms),
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          title: "Verify",
          tabBarBadge: badge(s?.pendingVerifications),
          tabBarIcon: ({ color }) => (
            <Feather name="shield" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarBadge: badge(s?.pendingReports),
          tabBarIcon: ({ color }) => (
            <Feather name="flag" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="support-tickets"
        options={{
          title: "Support",
          tabBarBadge: badge(s?.pendingTickets),
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="violations"
        options={{
          title: "Violations",
          tabBarBadge: badge(s?.recentViolations),
          tabBarIcon: ({ color }) => (
            <Feather name="alert-octagon" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="rejected-listings" options={{ href: null }} />
      <Tabs.Screen name="suspended-users" options={{ href: null }} />
      <Tabs.Screen name="user-detail" options={{ href: null }} />
      <Tabs.Screen name="user-violations" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="email-test" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
