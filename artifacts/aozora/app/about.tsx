import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const APP_VERSION = "1.0.0";
const SUPPORT_EMAIL = "aozorayourdormmate@gmail.com";
const LOCATION = "Lopez, Quezon, Philippines";

type Section = {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  content: string;
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I find a dorm?",
    a: "Go to the Explore tab to browse all approved dorms. Use filters to narrow by price or availability. Tap any dorm card to see full details, photos, location on the map, and owner info.",
  },
  {
    q: "How do I book a visit?",
    a: "Open a dorm detail page and tap 'Book a Visit'. Choose a date and time slot, add an optional message, then submit. The owner will approve or reject your request and you will see the status update in your Visits tab.",
  },
  {
    q: "How do I message a dorm owner?",
    a: "On any dorm detail page tap 'Message'. Type your inquiry and send. All conversations appear in your Messages tab. Replies arrive in the same thread.",
  },
  {
    q: "What is identity verification?",
    a: "Owners must verify their identity before their dorms are approved. Students can also verify to build trust with owners. Go to Profile > Identity Verification, choose your ID type, and upload a photo of it.",
  },
  {
    q: "How do I list my dorm?",
    a: "You need an Owner account. Go to Profile > My Listings and tap the + button. Fill in the dorm name, description, rent, address, room details, and a cover photo. Submit for admin review — approved listings appear in Explore.",
  },
  {
    q: "How long does dorm approval take?",
    a: "Admins typically review new listings within 24-48 hours. You can see the current status (Pending / Approved / Rejected) in My Listings at any time.",
  },
  {
    q: "Can I save dorms I like?",
    a: "Yes — tap the heart icon on any dorm card or detail page to save it. View all your saved dorms under Profile > Saved Favorites.",
  },
  {
    q: "How do I update my profile photo or name?",
    a: "Go to Profile and tap 'Edit Profile'. You can update your name, phone, birthday, bio, and profile photo. Changes are reflected everywhere in the app immediately after saving.",
  },
];

function FAQItem({ q, a, colors }: { q: string; a: string; colors: any }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setOpen((v) => !v)}
      activeOpacity={0.75}
      style={[
        styles.faqItem,
        { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius },
      ]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQ, { color: colors.foreground, flex: 1 }]}>{q}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </View>
      {open && (
        <Text style={[styles.faqA, { color: colors.mutedForeground }]}>{a}</Text>
      )}
    </TouchableOpacity>
  );
}

function InfoCard({
  icon,
  title,
  lines,
  accent,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  lines: string[];
  accent: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
      ]}
    >
      <View style={[styles.infoCardIcon, { backgroundColor: accent + "18" }]}>
        <Feather name={icon} size={22} color={accent} />
      </View>
      <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>{title}</Text>
      {lines.map((line, i) => (
        <View key={i} style={styles.infoCardLine}>
          <Feather name="check" size={13} color={accent} style={{ marginTop: 2 }} />
          <Text style={[styles.infoCardText, { color: colors.mutedForeground }]}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const role = user?.role ?? "boarder";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>About Aozora</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary + "12", borderRadius: colors.radius }]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primary }]}>
            <Ionicons name="home" size={32} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Aozora</Text>
          <Text style={[styles.heroTagline, { color: colors.foreground }]}>Home, but smarter.</Text>
          <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
            Aozora connects boarders in{" "}
            <Text style={{ fontWeight: "600", color: colors.foreground }}>{LOCATION}</Text>
            {" "}with verified dormitories — making it easier to find a safe, affordable place to stay near school.
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* Role-specific guide */}
        {role === "boarder" && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>For Boarders</Text>
            <InfoCard
              icon="search"
              title="Find Your Dorm"
              lines={[
                "Browse all approved dorms in the Explore tab",
                "Filter by price range or bed availability",
                "View photos, amenities, and exact location on the map",
                "Save favorites with the heart button",
              ]}
              accent={colors.primary}
              colors={colors}
            />
            <InfoCard
              icon="calendar"
              title="Book a Visit"
              lines={[
                "Open any dorm and tap 'Book a Visit'",
                "Choose a date and time that works for you",
                "Add an optional message to the owner",
                "Track approval status in the Visits tab",
              ]}
              accent="#10b981"
              colors={colors}
            />
            <InfoCard
              icon="message-circle"
              title="Message Owners"
              lines={[
                "Send a message directly from the dorm page",
                "All conversations live in your Messages tab",
                "Admins can also send you important notices there",
              ]}
              accent="#f59e0b"
              colors={colors}
            />
            <InfoCard
              icon="shield"
              title="Identity Verification"
              lines={[
                "Optional but builds trust with owners",
                "Upload a government-issued ID",
                "Verified badge appears on your profile",
              ]}
              accent="#8b5cf6"
              colors={colors}
            />
          </>
        )}

        {role === "owner" && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>For Owners</Text>
            <InfoCard
              icon="home"
              title="List Your Dorm"
              lines={[
                "Go to Profile → My Listings → tap +",
                "Add name, description, rent, address, and photos",
                "Submit for admin review — typically 24–48 hours",
                "Approved listings appear instantly in Explore",
              ]}
              accent={colors.primary}
              colors={colors}
            />
            <InfoCard
              icon="calendar"
              title="Manage Visit Requests"
              lines={[
                "Students can request visitation appointments",
                "Review date, time, and student message in Visits tab",
                "Approve or reject with one tap",
                "Add a note to your response for the student",
              ]}
              accent="#10b981"
              colors={colors}
            />
            <InfoCard
              icon="message-circle"
              title="Chat with Students"
              lines={[
                "Respond to student inquiries in Messages",
                "One thread per student per dorm",
                "Admins may also contact you for verification",
              ]}
              accent="#f59e0b"
              colors={colors}
            />
            <InfoCard
              icon="shield"
              title="Get Verified"
              lines={[
                "Identity verification is required before listings go live",
                "Go to Profile → Identity Verification",
                "Upload your government ID for admin review",
              ]}
              accent="#8b5cf6"
              colors={colors}
            />
          </>
        )}

        {role === "admin" && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>For Admins</Text>
            <InfoCard
              icon="settings"
              title="Dorm Approvals"
              lines={[
                "Review pending dorm listings in Admin → Dorms",
                "Approve or reject with a tap",
                "Only approved dorms are visible to students",
              ]}
              accent={colors.primary}
              colors={colors}
            />
            <InfoCard
              icon="users"
              title="User Management"
              lines={[
                "Browse all registered users in Admin → Users",
                "Suspend or reinstate accounts",
                "Message any user directly from their profile",
              ]}
              accent="#10b981"
              colors={colors}
            />
            <InfoCard
              icon="shield"
              title="ID Verifications"
              lines={[
                "Review owner ID submissions in Admin → Verifications",
                "Approve or reject each submission",
                "Approved owners gain the Verified badge",
              ]}
              accent="#8b5cf6"
              colors={colors}
            />
          </>
        )}

        {/* FAQ */}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Frequently Asked Questions</Text>
        {FAQS.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} colors={colors} />
        ))}

        {/* Development Team */}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Development Team</Text>
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          {[
            { name: "Krizzia Mariel Yabut", role: "Developer" },
            { name: "Joshua Marcaida", role: "Developer" },
            { name: "Leigh Torres", role: "Developer" },
            { name: "Hiram Paul Sigue", role: "Developer" },
          ].map((dev, i, arr) => (
            <View
              key={dev.name}
              style={[
                styles.detailRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.devAvatar, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="user" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{dev.name}</Text>
              </View>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{dev.role}</Text>
            </View>
          ))}
        </View>

        {/* Platform info */}
        <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Platform Details</Text>
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          {[
            { label: "App Version", value: APP_VERSION },
            { label: "Platform", value: "Aozora Mobile" },
            { label: "Coverage Area", value: LOCATION },
            { label: "Support Email", value: SUPPORT_EMAIL, link: `mailto:${SUPPORT_EMAIL}` },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              activeOpacity={row.link ? 0.6 : 1}
              onPress={() => row.link && Linking.openURL(row.link)}
              style={[
                styles.detailRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
              <Text style={[styles.detailValue, { color: row.link ? colors.primary : colors.foreground }]}>
                {row.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © {new Date().getFullYear()} Aozora · Built with care for Lopez, Quezon students.
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  body: { padding: 16, gap: 12 },

  hero: { alignItems: "center", padding: 28, gap: 10, marginBottom: 4 },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 32, fontWeight: "900", letterSpacing: -0.5 },
  heroTagline: { fontSize: 17, fontWeight: "600" },
  heroDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, marginTop: 4 },
  versionBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  versionText: { fontSize: 12, fontWeight: "600" },

  sectionHeading: { fontSize: 18, fontWeight: "700", marginTop: 8, marginBottom: 2 },

  infoCard: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  infoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardTitle: { fontSize: 16, fontWeight: "700" },
  infoCardLine: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  infoCardText: { fontSize: 14, lineHeight: 20, flex: 1 },

  faqItem: { borderWidth: 1, padding: 14, gap: 0 },
  faqHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  faqQ: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqA: { fontSize: 14, lineHeight: 21, marginTop: 10 },

  detailsCard: { borderWidth: 1, overflow: "hidden" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: "600" },

  footer: { fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 20 },
  devAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
