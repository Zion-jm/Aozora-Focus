import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmContextValue {
  showConfirm: (options: ConfirmOptions) => void;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

function ConfirmSheet({
  options,
  visible,
  onClose,
}: {
  options: ConfirmOptions | null;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 220,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!options) return null;

  const {
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
    icon,
    onConfirm,
    onCancel,
  } = options;

  const confirmColor = destructive ? "#ef4444" : "#4f46e5";
  const iconBg = destructive ? "#fef2f2" : "#eef2ff";
  const defaultIcon: React.ComponentProps<typeof Feather>["name"] = destructive
    ? "trash-2"
    : "check-circle";
  const resolvedIcon = icon ?? defaultIcon;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  const handleCancel = () => {
    onClose();
    onCancel?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 8,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Feather name={resolvedIcon} size={24} color={confirmColor} />
            </View>
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
              onPress={handleConfirm}
              activeOpacity={0.82}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const showConfirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOptions(null), 280);
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmSheet options={options} visible={visible} onClose={handleClose} />
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
    gap: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginBottom: 8,
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#475569",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
