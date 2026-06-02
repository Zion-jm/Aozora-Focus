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
const CONTACT_EMAIL = "support@aozora.ph";
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
    id: "acceptance",
    icon: "file-text",
    title: "1. Acceptance of Terms",
    paragraphs: [
      `By creating an account or using ${PLATFORM_NAME}, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use the platform.`,
      `These terms apply to all users of the platform, including students, dorm owners, and administrators.`,
    ],
  },
  {
    id: "eligibility",
    icon: "user-check",
    title: "2. Eligibility",
    paragraphs: [
      `You must be at least 18 years old, or have the consent of a parent or legal guardian, to use ${PLATFORM_NAME}. By using this platform you represent that you meet these requirements.`,
    ],
    bullets: [
      "You must provide accurate registration information.",
      "One account per person is permitted.",
      "You are responsible for all activity on your account.",
      "You must not share your login credentials with others.",
    ],
  },
  {
    id: "accounts",
    icon: "lock",
    title: "3. User Accounts",
    paragraphs: [
      `When you create an account, you are responsible for maintaining the confidentiality of your password and for all activities that occur under your account.`,
      `You agree to notify us immediately at ${CONTACT_EMAIL} if you suspect any unauthorized use of your account.`,
    ],
    bullets: [
      "Keep your password secure and do not share it.",
      "You are responsible for all actions taken through your account.",
      "Notify us immediately of any unauthorized account access.",
      "Aozora is not liable for losses from unauthorized account use.",
    ],
  },
  {
    id: "listings",
    icon: "home",
    title: "4. Dorm Listings",
    paragraphs: [
      `Dorm owners who submit listings agree that all information provided is accurate, complete, and up-to-date. Misleading listings — including false pricing, fabricated photos, or incorrect locations — are prohibited and may result in account suspension.`,
    ],
    bullets: [
      "All listing photos must depict the actual property.",
      "Pricing must reflect the true monthly rent.",
      "Room counts and availability must be kept accurate.",
      "Listings are subject to admin review before going live.",
      "Owners must respond to appointment requests in a timely manner.",
    ],
  },
  {
    id: "appointments",
    icon: "calendar",
    title: "5. Visitation Appointments",
    paragraphs: [
      `The appointment system is provided as a convenience tool to connect students and owners. ${PLATFORM_NAME} does not guarantee visit availability or owner responsiveness.`,
      `Students are expected to attend confirmed appointments punctually. Repeated no-shows may result in restrictions on booking privileges.`,
    ],
    bullets: [
      "Respect the owner's approved date and time.",
      "Cancel appointments in advance if you cannot attend.",
      "Owners may reject requests for any lawful reason.",
      "Do not attend a dorm visit without a confirmed appointment.",
    ],
  },
  {
    id: "prohibited",
    icon: "slash",
    title: "6. Prohibited Conduct",
    paragraphs: [
      `The following actions are strictly prohibited on ${PLATFORM_NAME}:`,
    ],
    bullets: [
      "Posting false, misleading, or fraudulent content.",
      "Harassing, threatening, or abusing other users.",
      "Using the platform for any illegal activity.",
      "Attempting to circumvent payments or transactions off-platform.",
      "Scraping, copying, or republishing platform content without permission.",
      "Creating multiple accounts or impersonating another person.",
      "Uploading malware or any harmful code.",
      "Manipulating ratings or reviews.",
    ],
  },
  {
    id: "content",
    icon: "image",
    title: "7. User Content",
    paragraphs: [
      `By uploading photos, messages, reviews, or any other content to ${PLATFORM_NAME}, you grant us a non-exclusive, royalty-free license to use, display, and store that content solely for the purpose of operating the platform.`,
      `You represent that you own or have the right to use all content you submit, and that it does not infringe any third-party rights.`,
    ],
    bullets: [
      "You retain ownership of content you submit.",
      "Content must not violate any intellectual property rights.",
      "We may remove content that violates these terms.",
    ],
  },
  {
    id: "privacy",
    icon: "shield",
    title: "8. Privacy",
    paragraphs: [
      `Your use of ${PLATFORM_NAME} is also governed by our Privacy Policy. We collect only the information necessary to operate the platform and will not sell your personal data to third parties.`,
      `Identity verification documents are reviewed by admins solely to confirm authenticity and are not shared outside the platform.`,
    ],
  },
  {
    id: "termination",
    icon: "user-x",
    title: "9. Account Suspension & Termination",
    paragraphs: [
      `We reserve the right to suspend or permanently terminate accounts that violate these Terms of Service, engage in prohibited conduct, or act in a manner harmful to other users or the platform.`,
      `Suspended users may appeal their suspension through the Help Center. Accounts terminated for serious violations — such as fraud or harassment — may not be eligible for reinstatement.`,
    ],
  },
  {
    id: "disclaimer",
    icon: "alert-circle",
    title: "10. Disclaimers & Limitations",
    paragraphs: [
      `${PLATFORM_NAME} is a listing and appointment coordination platform. We do not own, manage, or inspect any dorm listed on the platform. We make no guarantees about the condition, safety, or accuracy of any listing.`,
      `To the maximum extent permitted by law, ${PLATFORM_NAME} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.`,
    ],
  },
  {
    id: "governing",
    icon: "flag",
    title: "11. Governing Law",
    paragraphs: [
      `These Terms of Service are governed by the laws of the Republic of the Philippines. Any disputes arising from or related to these terms shall be resolved in the courts of ${LOCATION}.`,
    ],
  },
  {
    id: "changes",
    icon: "refresh-cw",
    title: "12. Changes to These Terms",
    paragraphs: [
      `We may update these Terms of Service from time to time. When we do, we will notify you through the app and update the "Last Updated" date. Continued use of ${PLATFORM_NAME} after changes constitutes acceptance of the new terms.`,
    ],
  },
  {
    id: "contact",
    icon: "mail",
    title: "13. Contact Us",
    paragraphs: [
      `If you have any questions about these Terms of Service, please contact us at ${CONTACT_EMAIL}.`,
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
        <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + "15" }]}>
          <Feather name={section.icon} size={18} color={colors.primary} />
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
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.mutedForeground }]}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function TermsOfServiceScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero banner */}
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.primary + "10", borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="file-text" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Terms of Service</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Please read these terms carefully before using {PLATFORM_NAME}. By creating an account, you agree to be bound by these terms.
          </Text>
          <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              Last updated: {LAST_UPDATED}
            </Text>
          </View>
        </View>

        {/* Sections */}
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
  heroSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
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
