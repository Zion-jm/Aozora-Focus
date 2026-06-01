import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";

// Show alerts, play sound, and set badge for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken(authToken: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const pushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    await fetch(`${base}/api/push-tokens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken.data, platform: Platform.OS }),
    });
  } catch {
    // Non-fatal — push registration should never crash the app
  }
}

async function unregisterPushToken(authToken: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const pushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const base = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
    await fetch(`${base}/api/push-tokens`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: pushToken.data }),
    });
  } catch {
    // Non-fatal
  }
}

export function usePushNotifications() {
  const { isAuthenticated, token: authToken } = useAuth();
  const notifListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (isAuthenticated && authToken) {
      registerPushToken(authToken);

      // Foreground notification received
      notifListener.current =
        Notifications.addNotificationReceivedListener(() => {
          // React Query polling handles refreshing the in-app list
        });

      // User tapped a notification
      responseListener.current =
        Notifications.addNotificationResponseReceivedListener(() => {
          // Could navigate based on notification data in the future
        });
    }

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();

      if (authToken) {
        unregisterPushToken(authToken);
      }
    };
  }, [isAuthenticated, authToken]);
}
