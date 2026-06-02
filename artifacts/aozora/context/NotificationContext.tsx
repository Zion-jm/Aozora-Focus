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
const POLL_INTERVAL_MS = 8_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  unreadCount: number;
  unreadMessageCount: number;
  refreshUnreadCount: () => Promise<void>;
  refreshUnreadMessageCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  unreadMessageCount: 0,
  refreshUnreadCount: async () => {},
  refreshUnreadMessageCount: async () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
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

  const refreshUnreadMessageCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const conversations: any[] = data.conversations ?? [];
        const total = conversations.reduce(
          (sum: number, c: any) => sum + (c.unreadCount || 0),
          0
        );
        setUnreadMessageCount(total);
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

  const pollAll = useCallback(async () => {
    await Promise.all([refreshUnreadCount(), refreshUnreadMessageCount()]);
  }, [refreshUnreadCount, refreshUnreadMessageCount]);

  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      setUnreadMessageCount(0);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollAll();
    registerPushToken();

    pollIntervalRef.current = setInterval(pollAll, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user?.id, token, pollAll, registerPushToken]);

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
    <NotificationContext.Provider
      value={{ unreadCount, unreadMessageCount, refreshUnreadCount, refreshUnreadMessageCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
