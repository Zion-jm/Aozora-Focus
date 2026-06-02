import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const LAST_UPDATED = "June 2025";
const CONTACT_EMAIL = "aozorayourdormmate@gmail.com";
const PLATFORM_NAME = "Aozora";
const LOCATION = "Lopez, Quezon, Philippines";

type Section = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "intro",
    icon: "info",
    title: "1. Introduction",
    paragraphs: [
      `${PLATFORM_NAME} ("we", "our", or "us") is committed to protecting the privacy of our users in ${LOCATION}. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.`,
      `By using Aozora, you consent to the practices described in this policy.`,
    ],
  },
  {
    id: "collected",
    icon: "database",
    title: "2. Information We Collect",
    paragraphs: [
      `We collect information you provide directly when you create an account or use the platform, as well as limited technical information needed to operate the service.`,
    ],
    bullets: [
      "Full name and email address (required for account creation).",
      "Phone number (optional, used for contact purposes).",
      "Birthday and workplace/university (optional profile fields).",
      "Emergency contact name and phone number (optional).",
      "Profile photo (optional, uploaded by you).",
      "Government-issued ID image (for identity verification only).",
      "Dorm listing details submitted by owners.",
      "Messages sent through the in-app messaging system.",
      "Appointment requests and their status.",
      "Reviews and ratings you write.",
      "Device type and operating system (for app compatibility).",
    ],
  },
  {
    id: "usage",
    icon: "settings",
    title: "3. How We Use Your Information",
    paragraphs: [
      `We use the information we collect solely to operate and improve the Aozora platform. We do not sell your personal data to any third party.`,
    ],
    bullets: [
      "Create and manage your account.",
      "Facilitate dorm discovery and visitation appointments.",
      "Enable messaging between boarders and dorm owners.",
      "Send in-app notifications about appointments and messages.",
      "Process identity verification submissions.",
      "Moderate content and enforce community guidelines.",
      "Display public profile information to other users (name, role, verification status).",
      "Generate anonymized platform statistics for admin oversight.",
    ],
  },
  {
    id: "sharing",
    icon: "share-2",
    title: "4. Information Sharing",
    paragraphs: [
      `We do not sell, rent, or trade your personal information to third parties. Limited information is shared only as follows:`,
    ],
    bullets: [
      "Your public profile (name, role, verification badge, and any profile photo) is visible to other registered users.",
      "Your phone number is visible to others only if you enable the public phone setting in your profile.",
      "Identity verification documents are reviewed only by Aozora administrators and are not shared externally.",
      "Anonymized, aggregated data may be used internally to understand platform usage.",
      "We may disclose information if required by Philippine law or a valid legal process.",
    ],
  },
  {
    id: "storage",
    icon: "hard-drive",
    title: "5. Data Storage & Security",
    paragraphs: [
      `Your data is stored on secure servers. We use industry-standard measures including password hashing, encrypted tokens, and access controls to protect your information.`,
      `No method of storage or transmission is 100% secure. We encourage you to use a strong, unique password and to log out of shared devices.`,
    ],
    bullets: [
      "Passwords are hashed using bcrypt — they are never stored in plain text.",
      "Authentication uses short-lived JWT tokens.",
      "Profile photos and ID images are stored using secure URL references.",
      "Only authorized administrators can access identity documents.",
    ],
  },
  {
    id: "retention",
    icon: "clock",
    title: "6. Data Retention",
    paragraphs: [
      `We retain your account information for as long as your account is active or as needed to operate the platform. If you request account deletion, we will remove your personal data within a reasonable timeframe, except where retention is required by law.`,
      `Messages and appointment history may be retained for a limited period after account deletion to resolve any outstanding disputes.`,
    ],
  },
  {
    id: "rights",
    icon: "user-check",
    title: "7. Your Rights",
    paragraphs: [
      `As a user of Aozora, you have the following rights regarding your personal data:`,
    ],
    bullets: [
      "Access — request a copy of the personal data we hold about you.",
      "Correction — update or correct inaccurate information via your profile settings.",
      "Deletion — request that we delete your account and associated personal data.",
      "Withdrawal of consent — stop using the platform at any time.",
      "Objection — contact us if you believe your data is being used in a way you did not consent to.",
    ],
  },
  {
    id: "children",
    icon: "alert-circle",
    title: "8. Minors",
    paragraphs: [
      `Aozora is not intended for users under 18 years of age without parental consent. We do not knowingly collect personal information from minors. If you believe a minor has registered without consent, please contact us at ${CONTACT_EMAIL} and we will remove the account promptly.`,
    ],
  },
  {
    id: "cookies",
    icon: "globe",
    title: "9. Cookies & Local Storage",
    paragraphs: [
      `The Aozora mobile app stores your authentication token in local device storage to keep you logged in. This data stays on your device and is not used for advertising or tracking purposes. You can clear it at any time by logging out of the app.`,
    ],
  },
  {
    id: "thirdparty",
    icon: "link",
    title: "10. Third-Party Services",
    paragraphs: [
      `Aozora may use third-party services for image hosting. These services operate under their own privacy policies. We select providers that meet appropriate data protection standards.`,
      `We do not integrate any advertising networks or sell data to marketing companies.`,
    ],
  },
  {
    id: "changes",
    icon: "refresh-cw",
    title: "11. Changes to This Policy",
    paragraphs: [
      `We may update this Privacy Policy from time to time. When we do, we will notify you through the app and update the "Last Updated" date at the top of this page. Continued use of Aozora after the update constitutes acceptance of the revised policy.`,
    ],
  },
  {
    id: "contact",
    icon: "mail",
    title: "12. Contact Us",
    paragraphs: [
      `If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at ${CONTACT_EMAIL}.`,
    ],
  },
];

function SectionCard({ section, colors }: { section: Section; colors: any }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        style={styles.cardHeader}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: "#10b98115" }]}>
          <Feather name={section.icon} size={18} color="#10b981" />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, flex: 1 }]}>
          {section.title}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.cardBody}>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={[styles.paragraph, { color: colors.mutedForeground }]}>
              {p}
            </Text>
          ))}
          {section.bullets && section.bullets.map((b, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: "#10b981" }]} />
              <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View
          style={[
            styles.hero,
            { backgroundColor: "#10b98110", borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: "#10b98120" }]}>
            <Feather name="lock" size={28} color="#10b981" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Privacy Policy</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            We take your privacy seriously. This policy explains exactly what data we collect, why we collect it, and how it is kept safe.
          </Text>
          <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              Last updated: {LAST_UPDATED}
            </Text>
          </View>
        </View>

        {/* Quick summary */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: "#10b98108",
              borderColor: "#10b98130",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="check-circle" size={18} color="#10b981" style={{ flexShrink: 0 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
              Our commitment to you
            </Text>
            <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>
              We collect only what is necessary to run Aozora. We never sell your data. Your identity documents are seen only by administrators. You can request deletion of your data at any time.
            </Text>
          </View>
        </View>

        {SECTIONS.map((s) => (
          <SectionCard key={s.id} section={s} colors={colors} />
        ))}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} {PLATFORM_NAME} · {LOCATION}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  body: { padding: 16, gap: 10 },

  hero: {
    alignItems: "center",
    padding: 24,
    gap: 10,
    marginBottom: 4,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 22, fontWeight: "800" },
  heroSub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  dateText: { fontSize: 12, fontWeight: "500" },

  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  summaryTitle: { fontSize: 14, fontWeight: "700" },
  summaryText: { fontSize: 13, lineHeight: 19 },

  card: { borderWidth: 1, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", lineHeight: 20 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 16, gap: 8 },

  paragraph: { fontSize: 13, lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  bulletText: { fontSize: 13, lineHeight: 20, flex: 1 },

  footer: { fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
