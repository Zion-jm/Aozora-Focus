import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useUpdateProfile } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";

const NOTIF_KEYS = {
  appointments: "notif_appointments",
  messages: "notif_messages",
  reviews: "notif_reviews",
  accountAlerts: "notif_account_alerts",
};

function SectionCard({
  title,
  icon,
  iconColor,
  children,
  colors,
}: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={[card.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={card.header}>
        <View style={[card.iconWrap, { backgroundColor: iconColor + "18" }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[card.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      <View style={[card.divider, { backgroundColor: colors.border }]} />
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  sublabel,
  value,
  onValueChange,
  loading,
  last,
  colors,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  loading?: boolean;
  last?: boolean;
  colors: any;
}) {
  return (
    <View
      style={[
        row.wrap,
        { borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border },
      ]}
    >
      <View style={row.text}>
        <Text style={[row.label, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[row.sub, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.primary + "80" }}
          thumbColor={value ? colors.primary : colors.mutedForeground}
        />
      )}
    </View>
  );
}

function ActionRow({
  label,
  sublabel,
  onPress,
  last,
  colors,
  chevron = true,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  last?: boolean;
  colors: any;
  chevron?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        row.wrap,
        { borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={row.text}>
        <Text style={[row.label, { color: colors.foreground }]}>{label}</Text>
        {sublabel ? (
          <Text style={[row.sub, { color: colors.mutedForeground }]}>{sublabel}</Text>
        ) : null}
      </View>
      {chevron && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [notifAppointments, setNotifAppointments] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifReviews, setNotifReviews] = useState(true);
  const [notifAccountAlerts, setNotifAccountAlerts] = useState(true);

  const [phonePublic, setPhonePublic] = useState(!!(user as any)?.phonePublic);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries();
        toast.success("Saved", "Privacy settings updated.");
        setSavingPrivacy(false);
      },
      onError: () => {
        toast.error("Error", "Could not save privacy settings.");
        setSavingPrivacy(false);
        setPhonePublic((v) => !v);
      },
    },
  });

  useEffect(() => {
    (async () => {
      const vals = await AsyncStorage.multiGet(Object.values(NOTIF_KEYS));
      const map = Object.fromEntries(vals);
      if (map[NOTIF_KEYS.appointments] !== null)
        setNotifAppointments(map[NOTIF_KEYS.appointments] !== "false");
      if (map[NOTIF_KEYS.messages] !== null)
        setNotifMessages(map[NOTIF_KEYS.messages] !== "false");
      if (map[NOTIF_KEYS.reviews] !== null)
        setNotifReviews(map[NOTIF_KEYS.reviews] !== "false");
      if (map[NOTIF_KEYS.accountAlerts] !== null)
        setNotifAccountAlerts(map[NOTIF_KEYS.accountAlerts] !== "false");
    })();
  }, []);

  const toggleNotif = async (
    key: string,
    value: boolean,
    setter: (v: boolean) => void,
  ) => {
    setter(value);
    await AsyncStorage.setItem(key, String(value));
  };

  const handlePhoneVisibility = (value: boolean) => {
    setPhonePublic(value);
    setSavingPrivacy(true);
    updateProfile.mutate({ data: { phonePublic: value } as any });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Settings" showBack onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <SectionCard title="Notifications" icon="bell" iconColor="#4f46e5" colors={colors}>
          <ToggleRow
            label="Appointment Updates"
            sublabel="Visit requests, approvals, and reminders"
            value={notifAppointments}
            onValueChange={(v) =>
              toggleNotif(NOTIF_KEYS.appointments, v, setNotifAppointments)
            }
            colors={colors}
          />
          <ToggleRow
            label="New Messages"
            sublabel="When you receive a chat message"
            value={notifMessages}
            onValueChange={(v) =>
              toggleNotif(NOTIF_KEYS.messages, v, setNotifMessages)
            }
            colors={colors}
          />
          {user?.role !== "owner" && (
            <ToggleRow
              label="Reviews"
              sublabel="When someone leaves you a review"
              value={notifReviews}
              onValueChange={(v) =>
                toggleNotif(NOTIF_KEYS.reviews, v, setNotifReviews)
              }
              colors={colors}
            />
          )}
          <ToggleRow
            label="Account Alerts"
            sublabel="Warnings, violations, and security notices"
            value={notifAccountAlerts}
            onValueChange={(v) =>
              toggleNotif(NOTIF_KEYS.accountAlerts, v, setNotifAccountAlerts)
            }
            colors={colors}
            last
          />
        </SectionCard>

        {/* Privacy */}
        <SectionCard title="Privacy" icon="eye" iconColor="#10b981" colors={colors}>
          <ToggleRow
            label="Show Phone Number"
            sublabel="Let other users see your number on your profile"
            value={phonePublic}
            onValueChange={handlePhoneVisibility}
            loading={savingPrivacy}
            colors={colors}
            last
          />
        </SectionCard>

        {/* Security */}
        <SectionCard title="Security" icon="lock" iconColor="#f59e0b" colors={colors}>
          <ActionRow
            label="Change Password"
            sublabel="Update your account password"
            onPress={() => router.push("/profile/edit")}
            colors={colors}
          />
          <ActionRow
            label="Change Email"
            sublabel="Update the email linked to your account"
            onPress={() => router.push("/profile/edit")}
            colors={colors}
            last
          />
        </SectionCard>

        {/* Legal */}
        <SectionCard title="Legal" icon="file-text" iconColor="#64748b" colors={colors}>
          <ActionRow
            label="Terms of Service"
            onPress={() => router.push("/terms-of-service")}
            colors={colors}
          />
          <ActionRow
            label="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
            colors={colors}
          />
          <ActionRow
            label="Community Guidelines"
            onPress={() => router.push("/community-guidelines")}
            colors={colors}
            last
          />
        </SectionCard>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Aozora v1.0.0 · Home, but smarter.
        </Text>
      </ScrollView>
    </View>
  );
}

const card = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  divider: { height: 1 },
});

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: "500" },
  sub: { fontSize: 12, lineHeight: 16 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 60,
    maxWidth: 640,
    alignSelf: Platform.OS === "web" ? ("center" as any) : undefined,
    width: "100%",
  },
  version: {
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 8,
  },
});
