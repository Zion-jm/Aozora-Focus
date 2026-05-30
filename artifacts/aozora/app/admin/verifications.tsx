import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  getAdminGetVerificationsQueryKey,
  useAdminGetVerifications,
  useAdminReviewVerification,
} from "@workspace/api-client-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const FILTERS = ["all", "pending", "approved", "rejected"];

export default function AdminVerificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("pending");

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetVerifications({
    query: { queryKey: getAdminGetVerificationsQueryKey() },
  });

  const all = (data as any)?.verifications || [];
  const items = all.filter((v: any) => filter === "all" || v.status === filter);

  const review = useAdminReviewVerification({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getAdminGetVerificationsQueryKey() }),
      onError: () => Alert.alert("Error", "Could not update verification."),
    },
  });

  const handleReview = (item: any, status: "approved" | "rejected") => {
    Alert.alert(
      `${status === "approved" ? "Approve" : "Reject"} ID?`,
      `Mark ${item.user?.fullName ?? "this user"}'s ID as ${status === "approved" ? "approved" : "rejected"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "approved" ? "Approve" : "Reject",
          style: status === "rejected" ? "destructive" : "default",
          onPress: () => review.mutate({ verificationId: item.id, data: { status } }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>ID Verifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { borderRadius: 20 }, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: filter === f ? "#fff" : colors.mutedForeground }]}>
              {STATUS_LABEL[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load verifications</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {(item.user?.fullName || "U")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground }]}>{item.user?.fullName || "—"}</Text>
                  <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{item.user?.email || item.user?.phone || ""}</Text>
                  <Text style={[styles.idType, { color: colors.mutedForeground }]}>ID: {item.idType}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] || "#64748b") + "22" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || "#64748b" }]}>
                    {STATUS_LABEL[item.status] || item.status}
                  </Text>
                </View>
              </View>

              {item.submittedAt && (
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                </Text>
              )}

              {item.idImageUrl && (
                <TouchableOpacity
                  style={[styles.viewIdBtn, { borderColor: colors.border, borderRadius: 8 }]}
                  onPress={() => Linking.openURL(item.idImageUrl)}
                >
                  <Feather name="external-link" size={14} color={colors.primary} />
                  <Text style={[styles.viewIdText, { color: colors.primary }]}>View ID Document</Text>
                </TouchableOpacity>
              )}

              {item.reviewNote && (
                <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                  <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Note</Text>
                  <Text style={[styles.noteText, { color: colors.foreground }]}>{item.reviewNote}</Text>
                </View>
              )}

              {item.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { backgroundColor: "#10b981", borderRadius: 8 }]}
                    onPress={() => handleReview(item, "approved")}
                    disabled={review.isPending}
                  >
                    <AntDesign name="checkcircle" size={16} color="#fff" />
                    <Text style={styles.btnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { backgroundColor: "#ef4444", borderRadius: 8 }]}
                    onPress={() => handleReview(item, "rejected")}
                    disabled={review.isPending}
                  >
                    <Feather name="x-circle" size={16} color="#fff" />
                    <Text style={styles.btnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {item.status !== "pending" && item.reviewedAt && (
                <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                  Reviewed: {new Date(item.reviewedAt).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shield" size={48} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontSize: 16 }]}>
                No {STATUS_LABEL[filter]?.toLowerCase()} verifications
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  filterBar: { flexDirection: "row", padding: 12, gap: 8, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 14 },
  card: { borderWidth: 1, padding: 16, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "bold" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "600" },
  userEmail: { fontSize: 13 },
  idType: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  dateText: { fontSize: 12 },
  viewIdBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14 },
  viewIdText: { fontSize: 14, fontWeight: "600" },
  noteBox: { padding: 10, gap: 2 },
  noteLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  noteText: { fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { paddingVertical: 60, alignItems: "center", gap: 12 },
});
