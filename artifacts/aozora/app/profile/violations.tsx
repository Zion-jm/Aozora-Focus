import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Harassment or Bullying",
  spam: "Spam or Unsolicited Messages",
  fake_listing: "Fraudulent Dorm Listing",
  fake_identity: "Identity Misrepresentation",
  hate_speech: "Hate Speech or Discrimination",
  inappropriate_content: "Inappropriate Content",
  no_show: "Repeated Appointment No-Shows",
  other: "Other Violation",
};

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  harassment: "alert-octagon",
  spam: "mail",
  fake_listing: "home",
  fake_identity: "user-x",
  hate_speech: "message-square",
  inappropriate_content: "eye-off",
  no_show: "calendar",
  other: "more-horizontal",
};

const SEVERITY_CONFIG: Record<number, { label: string; color: string; bg: string; points: number }> = {
  1: { label: "Low",      color: "#10b981", bg: "#10b98115", points: 1  },
  2: { label: "Medium",   color: "#f59e0b", bg: "#f59e0b15", points: 3  },
  3: { label: "High",     color: "#f97316", bg: "#f9731615", points: 6  },
  4: { label: "Critical", color: "#ef4444", bg: "#ef444415", points: 10 },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>["name"]; desc: string }> = {
  clean:            { label: "Clean Record",      color: "#10b981", bg: "#10b98112", icon: "check-circle",  desc: "Your account is in good standing with no active violations."          },
  warning:          { label: "Formal Warning",    color: "#f59e0b", bg: "#f59e0b12", icon: "alert-triangle", desc: "Your account has received a formal warning. Please review the guidelines." },
  short_suspension: { label: "Risk: 7-Day Suspension",  color: "#f97316", bg: "#f9731612", icon: "clock",          desc: "Your violation score may result in a short account suspension."          },
  long_suspension:  { label: "Risk: 30-Day Suspension", color: "#ef4444", bg: "#ef444412", icon: "user-x",         desc: "Your violation score may result in a longer account suspension."         },
  ban:              { label: "Risk: Permanent Ban",      color: "#7c3aed", bg: "#7c3aed12", icon: "slash",          desc: "Your violation score puts you at risk of a permanent ban."               },
};

function daysLeft(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

export default function MyViolationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["myViolations"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/violations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const violations: any[] = data?.violations ?? [];
  const score: number = data?.score ?? 0;
  const level: string = data?.level ?? "clean";
  const isSuspended: boolean = data?.isSuspended ?? false;
  const suspendedUntil: string | null = data?.suspendedUntil ?? null;
  const rec = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["clean"]!;
  const roundedScore = Math.round(score * 10) / 10;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Standing</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Violation history & account score</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={violations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
          ListHeaderComponent={
            <>
              {/* Suspension banner */}
              {isSuspended && (
                <View style={[styles.suspensionBanner, { backgroundColor: "#ef444410", borderColor: "#ef444440" }]}>
                  <Feather name="alert-circle" size={18} color="#ef4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.suspensionTitle, { color: "#ef4444" }]}>Account Suspended</Text>
                    {suspendedUntil ? (
                      <Text style={[styles.suspensionSub, { color: colors.mutedForeground }]}>
                        {daysLeft(suspendedUntil)} day{daysLeft(suspendedUntil) !== 1 ? "s" : ""} remaining · Ends {new Date(suspendedUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                      </Text>
                    ) : (
                      <Text style={[styles.suspensionSub, { color: colors.mutedForeground }]}>
                        Your account is under an indefinite suspension. Contact support to appeal.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Score card */}
              <View
                style={[
                  styles.scoreCard,
                  { backgroundColor: rec.bg, borderColor: rec.color + "40", borderRadius: colors.radius },
                ]}
              >
                <View style={styles.scoreLeft}>
                  <Text style={[styles.scoreNumber, { color: rec.color }]}>{roundedScore}</Text>
                  <Text style={[styles.scoreLabel, { color: rec.color }]}>Risk Score</Text>
                </View>
                <View style={[styles.scoreDivider, { backgroundColor: rec.color + "30" }]} />
                <View style={styles.scoreRight}>
                  <View style={[styles.recBadge, { backgroundColor: rec.color + "20", borderRadius: 8 }]}>
                    <Feather name={rec.icon} size={14} color={rec.color} />
                    <Text style={[styles.recBadgeText, { color: rec.color }]}>{rec.label}</Text>
                  </View>
                  <Text style={[styles.recDesc, { color: colors.mutedForeground }]}>{rec.desc}</Text>
                </View>
              </View>

              {/* Score guide */}
              <View
                style={[
                  styles.guideCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Text style={[styles.guideTitle, { color: colors.foreground }]}>How your score is calculated</Text>
                <Text style={[styles.guideBody, { color: colors.mutedForeground }]}>
                  Only violations from the last 30 days count toward your score — older violations are not factored in. Your score resets to 0 automatically once all violations are older than 30 days. Low = 1 pt · Medium = 3 pts · High = 6 pts · Critical = 10 pts.
                </Text>
                <View style={styles.thresholdRow}>
                  {[
                    { range: "0", label: "Clean",   color: "#10b981" },
                    { range: "1–4",  label: "Warning",  color: "#f59e0b" },
                    { range: "5–9",  label: "7-day",    color: "#f97316" },
                    { range: "10–19",label: "30-day",   color: "#ef4444" },
                    { range: "20+",  label: "Ban",      color: "#7c3aed" },
                  ].map((t) => (
                    <View key={t.range} style={[styles.threshChip, { backgroundColor: t.color + "15", borderRadius: 6 }]}>
                      <Text style={[styles.threshRange, { color: t.color }]}>{t.range}</Text>
                      <Text style={[styles.threshLabel, { color: t.color }]}>{t.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                VIOLATION HISTORY{violations.length > 0 ? ` · ${violations.length}` : ""}
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Feather name="check-circle" size={36} color="#10b981" />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No violations on record</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Your account is in good standing. Keep following community guidelines to maintain a clean record.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const sev = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG[1]!;
            const icon: React.ComponentProps<typeof Feather>["name"] = CATEGORY_ICONS[item.category] ?? "alert-octagon";
            return (
              <View
                style={[
                  styles.violCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <View style={styles.violTop}>
                  <View style={[styles.violIconWrap, { backgroundColor: sev.bg, borderRadius: 10 }]}>
                    <Feather name={icon} size={16} color={sev.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.violCategory, { color: colors.foreground }]}>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                    <Text style={[styles.violDate, { color: colors.mutedForeground }]}>
                      {new Date(item.created_at).toLocaleDateString("en-PH", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={[styles.sevBadge, { backgroundColor: sev.bg, borderRadius: 6 }]}>
                    <Text style={[styles.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
                  </View>
                </View>
                <Text style={[styles.violDesc, { color: colors.foreground }]}>{item.description}</Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 10 },

  suspensionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  suspensionTitle: { fontSize: 14, fontWeight: "700" },
  suspensionSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },

  scoreCard: {
    flexDirection: "row",
    borderWidth: 1.5,
    padding: 16,
    gap: 16,
    alignItems: "flex-start",
  },
  scoreLeft: { alignItems: "center", minWidth: 64 },
  scoreNumber: { fontSize: 40, fontWeight: "800", lineHeight: 44 },
  scoreLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  scoreDivider: { width: 1, alignSelf: "stretch" },
  scoreRight: { flex: 1, gap: 8 },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  recBadgeText: { fontSize: 13, fontWeight: "700" },
  recDesc: { fontSize: 12, lineHeight: 18 },

  guideCard: {
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  guideTitle: { fontSize: 14, fontWeight: "700" },
  guideBody: { fontSize: 12, lineHeight: 18 },
  thresholdRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  threshChip: { paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" },
  threshRange: { fontSize: 12, fontWeight: "700" },
  threshLabel: { fontSize: 10, fontWeight: "500" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: -4,
  },

  emptyCard: {
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  emptyDesc: { fontSize: 13, lineHeight: 18, textAlign: "center" },

  violCard: {
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  violTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  violIconWrap: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  violCategory: { fontSize: 14, fontWeight: "600" },
  violDate: { fontSize: 12, marginTop: 1 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  sevBadgeText: { fontSize: 11, fontWeight: "700" },
  violDesc: { fontSize: 13, lineHeight: 18 },
});
