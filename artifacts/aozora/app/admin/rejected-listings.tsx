import React from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import {
  getAdminGetDormsQueryKey,
  useAdminGetDorms,
  useAdminUpdateDormStatus,
  getGetDormsQueryKey,
} from "@workspace/api-client-react";

export default function TurnedDownListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useAdminGetDorms({
    query: { queryKey: getAdminGetDormsQueryKey() },
  });

  const allDorms = (data as any)?.dorms || [];
  const takenDown = allDorms.filter((d: any) => d.status === "taken_down");

  const update = useAdminUpdateDormStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminGetDormsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDormsQueryKey() });
      },
      onError: () => Alert.alert("Error", "Could not restore listing."),
    },
  });

  const handleUndo = (dorm: any) => {
    Alert.alert(
      "Restore Listing?",
      `Restore "${dorm.name}" back to active status? It will be visible to students again.`,
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
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Turned Down Listings
          </Text>
          {!isLoading && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {takenDown.length} {takenDown.length === 1 ? "listing" : "listings"} turned down
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
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
          data={takenDown}
          keyExtractor={(item: any) => item.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          renderItem={({ item }: { item: any }) => (
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
              <Image
                source={{
                  uri:
                    item.coverPhotoUrl ||
                    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text
                    style={[styles.dormName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <View style={[styles.takenDownBadge, { backgroundColor: "#f9731622" }]}>
                    <Text style={[styles.takenDownText, { color: "#f97316" }]}>turned down</Text>
                  </View>
                </View>

                <View style={[styles.reportBanner, { backgroundColor: "#f9731612", borderColor: "#f9731630" }]}>
                  <Feather name="flag" size={13} color="#f97316" />
                  <Text style={[styles.reportBannerText, { color: "#f97316" }]}>
                    Taken down due to user report
                  </Text>
                </View>

                <View style={styles.meta}>
                  <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                  <Text
                    style={[styles.address, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
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
                  <View
                    style={[
                      styles.noteBox,
                      { backgroundColor: colors.muted, borderRadius: 8 },
                    ]}
                  >
                    <Text style={[styles.noteLabel, { color: colors.mutedForeground }]}>
                      Admin note:
                    </Text>
                    <Text style={[styles.noteText, { color: colors.foreground }]}>
                      {item.adminNote}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.undoBtn,
                    {
                      backgroundColor: "#10b98115",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#10b98130",
                    },
                  ]}
                  onPress={() => handleUndo(item)}
                  disabled={update.isPending}
                >
                  <Feather name="rotate-ccw" size={15} color="#10b981" />
                  <Text style={[styles.undoBtnText, { color: "#10b981" }]}>
                    Undo — Restore to Active
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="check-circle" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No turned down listings
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No listings have been taken down via reports.
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
  headerSub: { fontSize: 13, marginTop: 1 },
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
});
