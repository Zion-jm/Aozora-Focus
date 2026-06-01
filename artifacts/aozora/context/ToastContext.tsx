import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  anim: Animated.Value;
  opacity: Animated.Value;
}

interface ToastAPI {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

interface ToastContextValue {
  toast: ToastAPI;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

const VARIANT_CONFIG = {
  success: { icon: "check-circle" as const, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  error:   { icon: "alert-circle"  as const, color: "#ef4444", bg: "#fff1f2", border: "#fecaca" },
  warning: { icon: "alert-triangle" as const, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  info:    { icon: "info"          as const, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
};

const DURATION = 3600;

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const top = (insets.top || 0) + 12;

  return (
    <View
      style={[styles.container, { top }]}
      pointerEvents="box-none"
    >
      {toasts.map((t) => {
        const cfg = VARIANT_CONFIG[t.variant];
        const translateY = t.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-80, 0],
        });
        return (
          <Animated.View
            key={t.id}
            style={[
              styles.toast,
              {
                backgroundColor: cfg.bg,
                borderColor: cfg.border,
                borderLeftColor: cfg.color,
                transform: [{ translateY }],
                opacity: t.opacity,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: cfg.color + "18" }]}>
              <Feather name={cfg.icon} size={18} color={cfg.color} />
            </View>
            <View style={styles.textWrap}>
              <Text style={[styles.title, { color: "#0f172a" }]} numberOfLines={2}>
                {t.title}
              </Text>
              {!!t.message && (
                <Text style={styles.message} numberOfLines={3}>
                  {t.message}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onDismiss(t.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeBtn}
            >
              <Feather name="x" size={15} color="#94a3b8" />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string, animValue?: Animated.Value) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
    const run = (anim: Animated.Value) => {
      Animated.parallel([
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      });
    };
    if (animValue) {
      run(animValue);
    } else {
      setToasts((prev) => {
        const item = prev.find((t) => t.id === id);
        if (item) run(item.anim);
        return prev;
      });
    }
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      const anim = new Animated.Value(0);
      const opacity = new Animated.Value(0);

      setToasts((prev) => {
        const next = [...prev.slice(-2), { id, variant, title, message, anim, opacity }];
        return next;
      });

      Animated.parallel([
        Animated.spring(anim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 200,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      timers.current[id] = setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          delete timers.current[id];
        });
      }, DURATION);
    },
    []
  );

  const toast: ToastAPI = {
    success: (t, m) => addToast("success", t, m),
    error:   (t, m) => addToast("error",   t, m),
    warning: (t, m) => addToast("warning", t, m),
    info:    (t, m) => addToast("info",    t, m),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    gap: 8,
    ...Platform.select({ web: { position: "fixed" as any } }),
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  message: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    paddingTop: 2,
  },
});
