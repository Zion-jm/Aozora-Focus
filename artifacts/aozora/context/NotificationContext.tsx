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
const POLL_INTERVAL_MS = 3_000;

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
        const count = data.unreadCount ?? 0;
        setUnreadCount(count);
        if (Platform.OS !== "web") {
          Notifications.setBadgeCountAsync(count).catch(() => {});
        }
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

  const pollAll = useCallback(async () => {
    await Promise.all([refreshUnreadCount(), refreshUnreadMessageCount()]);
  }, [refreshUnreadCount, refreshUnreadMessageCount]);

  useEffect(() => {
    if (!user || !token) {
      setUnreadCount(0);
      setUnreadMessageCount(0);
      if (Platform.OS !== "web") Notifications.setBadgeCountAsync(0).catch(() => {});
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollAll();

    pollIntervalRef.current = setInterval(pollAll, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [user?.id, token, pollAll]);

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
