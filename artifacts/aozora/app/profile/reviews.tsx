import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? "star" : "star-outline"}
          size={size}
          color={s <= rating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </View>
  );
}

function TabBar({
  active,
  onChange,
  colors,
}: {
  active: "written" | "received";
  onChange: (t: "written" | "received") => void;
  colors: any;
}) {
  return (
    <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
      {(["written", "received"] as const).map((tab) => {
        const isActive = active === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => onChange(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, { color: isActive ? colors.primary : colors.mutedForeground }]}>
              {tab === "written" ? "Written" : "Received"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EmptyState({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="star" size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reviews yet</Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

// ─── STUDENT: Written (dorm reviews) ──────────────────────────────────────────
function StudentWrittenList({ reviews, colors }: { reviews: any[]; colors: any }) {
  if (reviews.length === 0) {
    return <EmptyState label="You haven't reviewed any dorms yet." colors={colors} />;
  }
  return (
    <View style={styles.list}>
      {reviews.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          onPress={() => router.push(`/dorm/${r.dorm.id}`)}
          activeOpacity={0.85}
        >
          <View style={styles.cardDormRow}>
            {r.dorm.coverPhotoUrl ? (
              <Image source={{ uri: r.dorm.coverPhotoUrl }} style={[styles.dormThumb, { borderRadius: colors.radius - 2 }]} />
            ) : (
              <View style={[styles.dormThumbFallback, { backgroundColor: colors.secondary, borderRadius: colors.radius - 2 }]}>
                <Feather name="home" size={18} color={colors.mutedForeground} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>{r.dorm.name}</Text>
              <View style={styles.starDateRow}>
                <StarRow rating={r.rating} size={13} />
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>· {formatDate(r.createdAt)}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
          {r.comment ? (
            <Text style={[styles.comment, { color: colors.foreground, borderTopColor: colors.border }]} numberOfLines={3}>
              {r.comment}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── STUDENT: Received (user reviews from owners) ─────────────────────────────
function StudentReceivedList({ reviews, colors }: { reviews: any[]; colors: any }) {
  if (reviews.length === 0) {
    return <EmptyState label="You haven't received any reviews from owners yet." colors={colors} />;
  }
  return (
    <View style={styles.list}>
      {reviews.map((r) => (
        <View
          key={r.id}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <View style={styles.reviewerRow}>
            <UserAvatar
              name={r.reviewer.fullName}
              avatarUrl={r.reviewer.avatarUrl}
              size={38}
              color={colors.primary}
              backgroundColor={colors.primary + "22"}
              userId={r.reviewer.id}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.reviewerName, { color: colors.foreground }]} numberOfLines={1}>{r.reviewer.fullName}</Text>
              <View style={styles.starDateRow}>
                <StarRow rating={r.rating} size={13} />
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>· {formatDate(r.createdAt)}</Text>
              </View>
            </View>
          </View>
          {r.comment ? (
            <Text style={[styles.comment, { color: colors.foreground, borderTopColor: colors.border }]} numberOfLines={4}>
              {r.comment}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── OWNER: Written (student reviews) ─────────────────────────────────────────
function OwnerWrittenList({ reviews, colors }: { reviews: any[]; colors: any }) {
  if (reviews.length === 0) {
    return <EmptyState label="You haven't reviewed any students yet." colors={colors} />;
  }
  return (
    <View style={styles.list}>
      {reviews.map((r) => (
        <View
          key={r.id}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
        >
          <View style={styles.reviewerRow}>
            <UserAvatar
              name={r.student.fullName}
              avatarUrl={r.student.avatarUrl}
              size={38}
              color={colors.primary}
              backgroundColor={colors.primary + "22"}
              userId={r.student.id}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.studentNameRow}>
                <Text style={[styles.reviewerName, { color: colors.foreground }]} numberOfLines={1}>{r.student.fullName}</Text>
                {r.student.verificationStatus === "verified" && (
                  <View style={[styles.verifiedChip, { backgroundColor: "#10b98115" }]}>
                    <Ionicons name="checkmark-circle" size={11} color="#10b981" />
                    <Text style={[styles.verifiedChipText, { color: "#10b981" }]}>Verified</Text>
                  </View>
                )}
              </View>
              <View style={styles.starDateRow}>
                <StarRow rating={r.rating} size={13} />
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>· {formatDate(r.createdAt)}</Text>
              </View>
            </View>
          </View>
          {r.comment ? (
            <Text style={[styles.comment, { color: colors.foreground, borderTopColor: colors.border }]} numberOfLines={4}>
              {r.comment}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── OWNER: Received (grouped by dorm listing) ────────────────────────────────
function OwnerReceivedList({ listings, colors }: { listings: any[]; colors: any }) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (listings.length === 0) {
    return <EmptyState label="Your listings haven't received any reviews yet." colors={colors} />;
  }

  return (
    <View style={styles.list}>
      {listings.map((listing) => {
        const isOpen = expanded[listing.dorm.id] ?? true;
        return (
          <View key={listing.dorm.id} style={[styles.listingGroup, { borderColor: colors.border, borderRadius: colors.radius }]}>
            {/* Dorm header */}
            <TouchableOpacity
              style={[styles.listingHeader, { backgroundColor: colors.card, borderRadius: colors.radius }]}
              onPress={() => setExpanded((prev) => ({ ...prev, [listing.dorm.id]: !isOpen }))}
              activeOpacity={0.8}
            >
              {listing.dorm.coverPhotoUrl ? (
                <Image source={{ uri: listing.dorm.coverPhotoUrl }} style={[styles.dormThumb, { borderRadius: colors.radius - 2 }]} />
              ) : (
                <View style={[styles.dormThumbFallback, { backgroundColor: colors.secondary, borderRadius: colors.radius - 2 }]}>
                  <Feather name="home" size={18} color={colors.mutedForeground} />
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>{listing.dorm.name}</Text>
                <View style={styles.starDateRow}>
                  {listing.average ? (
                    <>
                      <StarRow rating={Math.round(listing.average)} size={12} />
                      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                        {listing.average.toFixed(1)} · {listing.reviews.length} {listing.reviews.length === 1 ? "review" : "reviews"}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>No reviews</Text>
                  )}
                </View>
              </View>
              <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Reviews under this dorm */}
            {isOpen && listing.reviews.map((r: any, idx: number) => (
              <View
                key={r.id}
                style={[
                  styles.listingReviewItem,
                  { borderTopColor: colors.border, backgroundColor: colors.background },
                  idx === listing.reviews.length - 1 && { borderBottomLeftRadius: colors.radius, borderBottomRightRadius: colors.radius },
                ]}
              >
                <View style={styles.reviewerRow}>
                  <UserAvatar
                    name={r.reviewer.fullName}
                    avatarUrl={r.reviewer.avatarUrl}
                    size={32}
                    color={colors.primary}
                    backgroundColor={colors.primary + "22"}
                    userId={r.reviewer.id}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewerNameSm, { color: colors.foreground }]} numberOfLines={1}>{r.reviewer.fullName}</Text>
                    <View style={styles.starDateRow}>
                      <StarRow rating={r.rating} size={12} />
                      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>· {formatDate(r.createdAt)}</Text>
                    </View>
                  </View>
                </View>
                {r.comment ? (
                  <Text style={[styles.commentSm, { color: colors.foreground }]} numberOfLines={4}>{r.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function ReviewsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<"written" | "received">("written");

  const fetchWithAuth = async (path: string) => {
    const res = await fetch(`${BASE_URL}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  };

  const sentQuery = useQuery({
    queryKey: ["reviews-my-sent", user?.id],
    queryFn: () => fetchWithAuth("/reviews/my-sent"),
    enabled: !!token,
  });

  const receivedQuery = useQuery({
    queryKey: ["reviews-my-received", user?.id],
    queryFn: () => fetchWithAuth("/reviews/my-received"),
    enabled: !!token,
  });

  const activeQuery = tab === "written" ? sentQuery : receivedQuery;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  const sentData = sentQuery.data;
  const receivedData = receivedQuery.data;

  function renderContent() {
    if (isLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load reviews.</Text>
          <TouchableOpacity onPress={() => activeQuery.refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.primary }}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (tab === "written") {
      if (user?.role === "student") {
        return <StudentWrittenList reviews={sentData?.reviews ?? []} colors={colors} />;
      }
      if (user?.role === "owner") {
        return <OwnerWrittenList reviews={sentData?.reviews ?? []} colors={colors} />;
      }
    }

    if (tab === "received") {
      if (user?.role === "student") {
        return <StudentReceivedList reviews={receivedData?.reviews ?? []} colors={colors} />;
      }
      if (user?.role === "owner") {
        return <OwnerReceivedList listings={receivedData?.listings ?? []} colors={colors} />;
      }
    }

    return null;
  }

  const totalWritten = user?.role === "student"
    ? sentData?.reviews?.length ?? 0
    : sentData?.reviews?.length ?? 0;
  const totalReceived = user?.role === "owner"
    ? (receivedData?.listings ?? []).reduce((sum: number, l: any) => sum + l.reviews.length, 0)
    : receivedData?.reviews?.length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary chips */}
      <View style={[styles.summaryRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.summaryChip, { backgroundColor: colors.secondary }]}>
          <Feather name="edit-3" size={13} color={colors.mutedForeground} />
          <Text style={[styles.summaryChipText, { color: colors.foreground }]}>
            {sentQuery.isLoading ? "—" : totalWritten} written
          </Text>
        </View>
        <View style={[styles.summaryChip, { backgroundColor: colors.secondary }]}>
          <Feather name="inbox" size={13} color={colors.mutedForeground} />
          <Text style={[styles.summaryChipText, { color: colors.foreground }]}>
            {receivedQuery.isLoading ? "—" : totalReceived} received
          </Text>
        </View>
      </View>

      <TabBar active={tab} onChange={setTab} colors={colors} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => activeQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {renderContent()}
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryChipText: { fontSize: 13, fontWeight: "600" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabText: { fontSize: 15, fontWeight: "600" },

  body: { padding: 16, gap: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },

  emptyWrap: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center", maxWidth: 260 },

  list: { gap: 12 },

  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  cardDormRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  dormThumb: { width: 52, height: 52, resizeMode: "cover" },
  dormThumbFallback: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  dormName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },

  reviewerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  reviewerName: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  reviewerNameSm: { fontSize: 13, fontWeight: "700", marginBottom: 2 },

  studentNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  verifiedChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  verifiedChipText: { fontSize: 10, fontWeight: "700" },

  starDateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { fontSize: 12 },

  comment: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  commentSm: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  // Owner received grouping
  listingGroup: { borderWidth: 1, overflow: "hidden" },
  listingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  listingReviewItem: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
