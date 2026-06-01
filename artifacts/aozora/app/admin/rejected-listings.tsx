import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  getAdminGetDormsQueryKey,
  useAdminGetDorms,
  useAdminUpdateDormStatus,
  getGetDormsQueryKey,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export default function TurnedDownListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetDorms({
    query: { queryKey: getAdminGetDormsQueryKey() },
  });

  const { data: reportsData } = useQuery({
    queryKey: ["admin-reports-all"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/admin/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { reports: [] };
      return res.json();
    },
    enabled: !!token,
  });

  const reports: any[] = reportsData?.reports || [];

  const getReportForDorm = (dormId: number) =>
    reports.find(
      (r) => r.target_type === "dorm" && r.target_id === dormId && r.taken_down_at
    );

  const allDorms = (data as any)?.dorms || [];
  const takenDown = allDorms.filter((d: any) => d.status === "taken_down");

  const filtered = useMemo(() => {
    if (!search.trim()) return takenDown;
    const q = search.toLowerCase();
    return takenDown.filter(
      (d: any) =>
        d.name?.toLowerCase().includes(q) ||
        d.address?.toLowerCase().includes(q) ||
        d.owner?.fullName?.toLowerCase().includes(q)
    );
  }, [takenDown, search]);

  const update = useAdminUpdateDormStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetDormsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
        Alert.alert(
          "Listing Restored",
          "The listing is now approved and visible to all students on the Explore page."
        );
      },
      onError: () => Alert.alert("Error", "Could not restore listing. Please try again."),
    },
  });

  const handleUndo = (dorm: any) => {
    Alert.alert(
      "Restore Listing?",
      `"${dorm.name}" will be marked as approved and shown to all students on the Explore page.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: () => update.mutate({ dormId: dorm.id, data: { status: "approved" } }),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            backgroundColor: colors.primary,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            Turned Down Listings
          </Text>
          {!isLoading && (
            <Text style={styles.headerSub}>
              {takenDown.length} {takenDown.length === 1 ? "listing" : "listings"} turned down
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name, address, or owner…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={{ color: colors.destructive }}>Failed to load listings</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          renderItem={({ item }: { item: any }) => {
            const report = getReportForDorm(item.id);
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Image
                  source={{
                    uri: item.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
                  }}
                  style={styles.cardImage}
                />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.dormName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={[styles.takenDownBadge, { backgroundColor: "#f9731622" }]}>
                      <Text style={[styles.takenDownText, { color: "#f97316" }]}>turned down</Text>
                    </View>
                  </View>

                  <View style={[styles.reportBanner, { backgroundColor: "#f9731612", borderColor: "#f9731630" }]}>
                    <Feather name="flag" size={13} color="#f97316" />
                    <Text style={[styles.reportBannerText, { color: "#f97316", flex: 1 }]}>
                      Taken down due to user report
                      {report ? ` · ${report.reason}` : ""}
                    </Text>
                    {report && (
                      <TouchableOpacity
                        onPress={() => setSelectedReport(report)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.viewReportText, { color: "#f97316" }]}>View Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.meta}>
                    <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>

                  <Text style={[styles.price, { color: colors.primary }]}>
                    ₱{Number(item.monthlyRent).toLocaleString()}/mo
                  </Text>

                  <Text style={[styles.owner, { color: colors.mutedForeground }]}>
                    Owner: {item.owner?.fullName || "—"}
                  </Text>

                  {item.adminNote ? (
                    <View style={[styles.noteBox, { backgroundColor: colors.muted, borderRadius: 8 }]}>
                      <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>Admin note:</Text>
                      <Text style={[styles.noteText, { color: colors.foreground }]}>{item.adminNote}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.undoBtn,
                      { backgroundColor: "#10b98115", borderRadius: 8, borderWidth: 1, borderColor: "#10b98130" },
                    ]}
                    onPress={() => handleUndo(item)}
                    disabled={update.isPending}
                  >
                    <Feather name="rotate-ccw" size={15} color="#10b981" />
                    <Text style={[styles.undoBtnText, { color: "#10b981" }]}>Undo — Restore to Active</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              {search.trim() ? (
                <>
                  <Feather name="search" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No listings match "{search}"
                  </Text>
                </>
              ) : (
                <>
                  <Feather name="check-circle" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No turned down listings</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No listings have been taken down via reports.
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}

      <Modal
        visible={!!selectedReport}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderRadius: colors.radius }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Report Details</Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ReportRow label="Reason" value={selectedReport?.reason} colors={colors} />
              <ReportRow label="Details" value={selectedReport?.details || "No additional details"} colors={colors} />
              <ReportRow label="Reporter" value={selectedReport?.reporter_name || "—"} colors={colors} />
              <ReportRow label="Reporter email" value={selectedReport?.reporter_email || "—"} colors={colors} />
              <ReportRow
                label="Taken down"
                value={selectedReport?.taken_down_at ? new Date(selectedReport.taken_down_at).toLocaleString() : "—"}
                colors={colors}
              />
              <ReportRow
                label="Report filed"
                value={selectedReport?.created_at ? new Date(selectedReport.created_at).toLocaleString() : "—"}
                colors={colors}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReportRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.reportRow}>
      <Text style={[styles.reportRowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.reportRowValue, { color: colors.foreground }]}>{value}</Text>
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
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  listContent: { padding: 16, gap: 16 },
  card: { borderWidth: 1, overflow: "hidden" },
  cardImage: { width: "100%", height: 140 },
  cardContent: { padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dormName: { fontSize: 17, fontWeight: "600", flex: 1, marginRight: 10 },
  takenDownBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  takenDownText: { fontSize: 12, fontWeight: "600" },
  reportBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  reportBannerText: { fontSize: 12, fontWeight: "600" },
  viewReportText: { fontSize: 12, fontWeight: "700", textDecorationLine: "underline" },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  address: { fontSize: 13, flex: 1 },
  price: { fontSize: 15, fontWeight: "bold" },
  owner: { fontSize: 13 },
  noteBox: { padding: 10, gap: 2 },
  noteLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  noteText: { fontSize: 13 },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    marginTop: 2,
  },
  undoBtnText: { fontSize: 14, fontWeight: "600" },
  empty: { paddingVertical: 80, alignItems: "center", gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyText: { fontSize: 14, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: { width: "100%", maxHeight: "70%", overflow: "hidden" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: { fontSize: 17, fontWeight: "bold" },
  modalBody: { padding: 18 },
  reportRow: { marginBottom: 16 },
  reportRowLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  reportRowValue: { fontSize: 15 },
});
