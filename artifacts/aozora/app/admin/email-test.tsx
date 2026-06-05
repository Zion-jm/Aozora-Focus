import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

type EmailType = {
  type: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

const EMAIL_TYPES: { section: string; items: EmailType[] }[] = [
  {
    section: "Account Actions",
    items: [
      {
        type: "suspension_7day",
        label: "7-Day Suspension",
        description: "Harassment violation notice",
        icon: "clock",
        color: "#f97316",
      },
      {
        type: "suspension_30day",
        label: "30-Day Suspension",
        description: "Repeated policy violation notice",
        icon: "clock",
        color: "#ef4444",
      },
      {
        type: "ban",
        label: "Permanent Ban",
        description: "Account termination notice",
        icon: "slash",
        color: "#7c3aed",
      },
      {
        type: "suspension_lifted",
        label: "Suspension Lifted",
        description: "Account access fully restored",
        icon: "check-circle",
        color: "#10b981",
      },
    ],
  },
  {
    section: "Appeals",
    items: [
      {
        type: "appeal_approved",
        label: "Appeal Approved",
        description: "Suspension lifted via appeal",
        icon: "thumbs-up",
        color: "#10b981",
      },
      {
        type: "appeal_denied",
        label: "Appeal Denied",
        description: "Appeal rejected, suspension continues",
        icon: "thumbs-down",
        color: "#ef4444",
      },
    ],
  },
  {
    section: "Verifications",
    items: [
      {
        type: "verification_approved",
        label: "ID Verification Approved",
        description: "Identity verified successfully",
        icon: "shield",
        color: "#10b981",
      },
      {
        type: "verification_rejected",
        label: "ID Verification Rejected",
        description: "Photo unclear or invalid",
        icon: "shield-off",
        color: "#ef4444",
      },
    ],
  },
  {
    section: "Support & Bugs",
    items: [
      {
        type: "bug_in_progress",
        label: "Bug In Progress",
        description: "Bug report acknowledged",
        icon: "tool",
        color: "#f59e0b",
      },
      {
        type: "bug_fixed",
        label: "Bug Fixed",
        description: "Bug report resolved",
        icon: "check-square",
        color: "#10b981",
      },
      {
        type: "support_response",
        label: "Support Response",
        description: "Ticket marked as resolved",
        icon: "message-circle",
        color: "#3b82f6",
      },
    ],
  },
  {
    section: "Auth",
    items: [
      {
        type: "otp",
        label: "OTP Verification Code",
        description: "Send a 6-digit test OTP",
        icon: "key",
        color: "#6366f1",
      },
    ],
  },
];

export default function EmailTestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);

  const mockRecipient = "krizziamariel0925@gmail.com";

  async function sendTest(type: string) {
    if (!token) return;
    setSending(type);
    try {
      const res = await fetch(`${BASE_URL}/api/admin/test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Sent!", `→ ${data.sentTo}`);
    } catch (e: any) {
      toast.error("Error", e.message);
    } finally {
      setSending(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Test Emails" subtitle={`→ ${mockRecipient}`} />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.banner,
            { backgroundColor: "#3b82f620", borderColor: "#3b82f640" },
          ]}
        >
          <Feather name="info" size={15} color="#3b82f6" />
          <Text style={[styles.bannerText, { color: "#3b82f6" }]}>
            All emails are redirected to{" "}
            <Text style={{ fontWeight: "700" }}>{mockRecipient}</Text>. The
            subject line will show the original recipient.
          </Text>
        </View>

        {EMAIL_TYPES.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              {section.section.toUpperCase()}
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                const isSending = sending === item.type;
                return (
                  <View key={item.type}>
                    <View style={styles.row}>
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: `${item.color}20` },
                        ]}
                      >
                        <Feather name={item.icon} size={18} color={item.color} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>
                          {item.description}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.sendBtn,
                          {
                            backgroundColor: isSending
                              ? `${item.color}30`
                              : `${item.color}18`,
                            borderColor: `${item.color}50`,
                          },
                        ]}
                        onPress={() => sendTest(item.type)}
                        disabled={sending !== null}
                        activeOpacity={0.7}
                      >
                        {isSending ? (
                          <ActivityIndicator size={14} color={item.color} />
                        ) : (
                          <Feather name="send" size={14} color={item.color} />
                        )}
                        <Text style={[styles.sendBtnText, { color: item.color }]}>
                          {isSending ? "Sending" : "Send"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {!isLast && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, gap: 16 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginLeft: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowDesc: { fontSize: 12, marginTop: 2 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sendBtnText: { fontSize: 13, fontWeight: "700" },
  divider: { height: 1, marginLeft: 64 },
});
