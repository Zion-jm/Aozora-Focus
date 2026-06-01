import React, { useRef, useEffect } from "react";
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

export interface ActionSheetItem {
  label: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  items: ActionSheetItem[];
  onClose: () => void;
}

export function ActionSheet({
  visible,
  title,
  message,
  items,
  onClose,
}: ActionSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}
          <View style={styles.list}>
            {items.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.item,
                  item.disabled && styles.itemDisabled,
                  idx < items.length - 1 && styles.itemBorder,
                ]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                disabled={item.disabled}
                activeOpacity={0.7}
              >
                {item.icon && (
                  <View
                    style={[
                      styles.itemIcon,
                      {
                        backgroundColor: item.destructive
                          ? "#fef2f2"
                          : "#f1f5f9",
                      },
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={18}
                      color={item.destructive ? "#ef4444" : "#475569"}
                    />
                  </View>
                )}
                <Text
                  style={[
                    styles.itemLabel,
                    item.destructive && styles.itemLabelDestructive,
                    item.disabled && styles.itemLabelDisabled,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
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
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
    gap: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    alignSelf: "center",
    marginBottom: 8,
  },
  header: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    gap: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  message: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  list: {
    gap: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0f172a",
    flex: 1,
  },
  itemLabelDestructive: {
    color: "#ef4444",
  },
  itemLabelDisabled: {
    color: "#94a3b8",
  },
  cancelBtn: {
    marginTop: 8,
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
});
