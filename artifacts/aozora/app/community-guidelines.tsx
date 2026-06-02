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

type Guideline = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  accent: string;
  description: string;
  dos: string[];
  donts: string[];
};

const GUIDELINES: Guideline[] = [
  {
    id: "respect",
    icon: "heart",
    title: "Be Respectful",
    accent: "#4f46e5",
    description:
      "Every person on Aozora — boarder, owner, or admin — deserves to be treated with dignity. Keep all interactions courteous and professional.",
    dos: [
      "Use polite, constructive language in messages and reviews.",
      "Respect cultural differences and diverse backgrounds.",
      "Give owners reasonable time to respond to inquiries.",
      "Accept rejections gracefully — owners have the right to decline.",
    ],
    donts: [
      "Use insults, slurs, or degrading language.",
      "Bully, intimidate, or make threats toward other users.",
      "Send repeated unwanted messages after being asked to stop.",
    ],
  },
  {
    id: "honesty",
    icon: "check-square",
    title: "Be Honest",
    accent: "#10b981",
    description:
      "Aozora works because people trust each other. Honesty in listings, reviews, and interactions keeps the community safe and reliable.",
    dos: [
      "Provide accurate information in your profile and listings.",
      "Write reviews based on genuine, first-hand experience.",
      "Accurately represent availability, pricing, and amenities.",
      "Disclose any issues with a dorm that boarders should know about.",
    ],
    donts: [
      "Post fake, exaggerated, or misleading listings.",
      "Write reviews for dorms you have not visited.",
      "Offer or solicit payment for fake positive reviews.",
      "Claim to be someone you are not.",
    ],
  },
  {
    id: "safety",
    icon: "shield",
    title: "Stay Safe",
    accent: "#f59e0b",
    description:
      "Your safety matters. Always take precautions when meeting someone you connected with on Aozora.",
    dos: [
      "Visit dorms during daylight hours when possible.",
      "Bring a friend or family member to dorm visits.",
      "Keep communication within the app until you trust the other party.",
      "Report suspicious behavior to an admin immediately.",
      "Only confirm visits through official appointment channels.",
    ],
    donts: [
      "Share sensitive personal information (full address, ID details) in messages.",
      "Agree to meet in non-public or unfamiliar locations without caution.",
      "Make or accept direct cash transactions through the platform.",
      "Ignore warning signs of fraud or misrepresentation.",
    ],
  },
  {
    id: "listings",
    icon: "home",
    title: "Accurate Listings (Owners)",
    accent: "#8b5cf6",
    description:
      "Dorm owners have a responsibility to maintain listings that genuinely represent their property.",
    dos: [
      "Use real, recent photos of your actual property.",
      "Keep rental prices, availability, and room counts current.",
      "Clearly describe amenities and rules (e.g. curfew, guests policy).",
      "Update the listing promptly when availability changes.",
    ],
    donts: [
      "Use stock photos or photos of a different property.",
      "Advertise a price lower than what you actually charge.",
      "Approve appointments for units that are no longer available.",
      "Omit material information that would affect a student's decision.",
    ],
  },
  {
    id: "appointments",
    icon: "calendar",
    title: "Honor Appointments",
    accent: "#ec4899",
    description:
      "Visitation appointments represent real time commitments. Treat them seriously.",
    dos: [
      "Show up on time for confirmed visits.",
      "Cancel in advance if you can no longer attend.",
      "Owners should be present and accessible during the appointment.",
      "Confirm all scheduling changes through the app.",
    ],
    donts: [
      "Book appointments with no intention of attending.",
      "Repeatedly cancel at the last minute.",
      "Conduct visits outside of the confirmed schedule without owner consent.",
    ],
  },
  {
    id: "reporting",
    icon: "flag",
    title: "Report Violations",
    accent: "#ef4444",
    description:
      "If you encounter content or behavior that violates these guidelines, please report it. Your report helps keep Aozora safe for everyone.",
    dos: [
      "Report fake listings, harassment, or suspicious behavior.",
      "Use the in-app report button on dorm pages, user profiles, or messages.",
      "Provide as much detail as possible in your report.",
      "Contact support at " + CONTACT_EMAIL + " for urgent issues.",
    ],
    donts: [
      "Abuse the report system to target users you have a personal dispute with.",
      "Retaliate against users who report your content.",
      "Try to resolve serious safety concerns on your own — always report.",
    ],
  },
  {
    id: "spam",
    icon: "x-octagon",
    title: "No Spam or Scams",
    accent: "#f97316",
    description:
      "Spam and scams destroy trust and waste everyone's time. Keep interactions relevant and genuine.",
    dos: [
      "Send messages only to users you have a genuine inquiry for.",
      "Keep conversations relevant to dorm-related topics.",
    ],
    donts: [
      "Send bulk, repetitive, or irrelevant messages to multiple users.",
      "Use the platform to promote unrelated businesses or services.",
      "Attempt to move boarders off-platform to avoid oversight.",
      "Request deposits or payments before a visit has been confirmed.",
    ],
  },
];

const CONSEQUENCES = [
  {
    level: "Warning",
    icon: "alert-triangle" as React.ComponentProps<typeof Feather>["name"],
    color: "#f59e0b",
    description: "First-time minor violations receive a written warning from the admin team.",
  },
  {
    level: "Content Removal",
    icon: "trash-2" as React.ComponentProps<typeof Feather>["name"],
    color: "#f97316",
    description: "Listings, reviews, or messages that violate guidelines will be removed.",
  },
  {
    level: "Temporary Suspension",
    icon: "pause-circle" as React.ComponentProps<typeof Feather>["name"],
    color: "#ef4444",
    description: "Repeated or serious violations may result in temporary account suspension.",
  },
  {
    level: "Permanent Ban",
    icon: "user-x" as React.ComponentProps<typeof Feather>["name"],
    color: "#7f1d1d",
    description: "Fraud, harassment, or repeated severe violations result in permanent account removal.",
  },
];

function GuidelineCard({ guideline, colors }: { guideline: Guideline; colors: any }) {
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
        <View style={[styles.cardIconWrap, { backgroundColor: guideline.accent + "18" }]}>
          <Feather name={guideline.icon} size={18} color={guideline.accent} />
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground, flex: 1 }]}>
          {guideline.title}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {guideline.description}
          </Text>

          <View style={[styles.dosDontsRow]}>
            {/* Dos */}
            <View style={[styles.dosDontsCol, { flex: 1 }]}>
              <View style={styles.colHeader}>
                <Feather name="check-circle" size={13} color="#10b981" />
                <Text style={[styles.colLabel, { color: "#10b981" }]}>Do</Text>
              </View>
              {guideline.dos.map((item, i) => (
                <View key={i} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
                  <Text style={[styles.listText, { color: colors.mutedForeground }]}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Don'ts */}
            <View style={[styles.dosDontsCol, { flex: 1 }]}>
              <View style={styles.colHeader}>
                <Feather name="x-circle" size={13} color="#ef4444" />
                <Text style={[styles.colLabel, { color: "#ef4444" }]}>Don't</Text>
              </View>
              {guideline.donts.map((item, i) => (
                <View key={i} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: "#ef4444" }]} />
                  <Text style={[styles.listText, { color: colors.mutedForeground }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function CommunityGuidelinesScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community Guidelines</Text>
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
            { backgroundColor: "#4f46e510", borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: "#4f46e520" }]}>
            <Feather name="users" size={28} color="#4f46e5" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Community Guidelines</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Aozora is built on trust. These guidelines exist to keep our community safe, honest, and welcoming for every boarder and owner in Lopez, Quezon.
          </Text>
          <View style={[styles.dateBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              Last updated: {LAST_UPDATED}
            </Text>
          </View>
        </View>

        {/* Guidelines */}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Our Standards</Text>
        {GUIDELINES.map((g) => (
          <GuidelineCard key={g.id} guideline={g} colors={colors} />
        ))}

        {/* Consequences */}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Consequences of Violations</Text>
        <View
          style={[
            styles.consequencesCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {CONSEQUENCES.map((c, i) => (
            <View
              key={c.level}
              style={[
                styles.consequenceRow,
                i < CONSEQUENCES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.consequenceIcon, { backgroundColor: c.color + "18" }]}>
                <Feather name={c.icon} size={18} color={c.color} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.consequenceLevel, { color: c.color }]}>{c.level}</Text>
                <Text style={[styles.consequenceDesc, { color: colors.mutedForeground }]}>
                  {c.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Appeal note */}
        <View
          style={[
            styles.appealNote,
            {
              backgroundColor: colors.primary + "08",
              borderColor: colors.primary + "30",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="message-circle" size={18} color={colors.primary} style={{ flexShrink: 0 }} />
          <Text style={[styles.appealNoteText, { color: colors.mutedForeground }]}>
            Believe a moderation action was made in error?{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Submit an appeal
            </Text>{" "}
            through Help Center → Support Ticket, or email us at{" "}
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{CONTACT_EMAIL}</Text>.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} {PLATFORM_NAME} · Built for Lopez, Quezon boarders.
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

  sectionHeading: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 2,
  },

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
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardBody: { paddingHorizontal: 14, paddingBottom: 16, gap: 12 },

  description: { fontSize: 13, lineHeight: 20 },

  dosDontsRow: { flexDirection: "row", gap: 0 },
  dosDontsCol: { gap: 8 },
  divider: { width: 1, marginHorizontal: 12 },
  colHeader: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  colLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  listRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  listText: { fontSize: 12, lineHeight: 18, flex: 1 },

  consequencesCard: { borderWidth: 1, overflow: "hidden" },
  consequenceRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 14 },
  consequenceIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  consequenceLevel: { fontSize: 14, fontWeight: "700" },
  consequenceDesc: { fontSize: 13, lineHeight: 18 },

  appealNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  appealNoteText: { fontSize: 13, lineHeight: 20, flex: 1 },

  footer: { fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
