import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useAuth } from "./AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/notifications?unread=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch {
      // silently ignore network errors
    }
  }, [token]);

  const registerPushToken = useCallback(async () => {
    if (!token || Platform.OS === "web") return;
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;

      const pushToken = await Notifications.getExpoPushTokenAsync();
      await fetch(`${BASE_URL}/api/users/me/push-token`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expoPushToken: pushToken.data }),
      });
    } catch {
      // silently ignore — push is a nice-to-have
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    refreshUnreadCount();
    registerPushToken();

    pollIntervalRef.current = setInterval(refreshUnreadCount, 30_000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user?.id, token, refreshUnreadCount, registerPushToken]);

  // Navigate to the relevant screen when a push notification is tapped
  useEffect(() => {
    responseListenerRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        if (data?.path) {
          router.push(data.path);
        }
      });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
