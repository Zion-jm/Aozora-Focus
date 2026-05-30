import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import {
  getGetAppointmentByIdQueryKey,
  useGetAppointmentById,
  useUpdateAppointmentStatus,
  getGetAppointmentsQueryKey,
} from "@workspace/api-client-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
};

export default function AppointmentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const appointmentId = Number(id);

  const { data, isLoading } = useGetAppointmentById(id!, {
    query: { enabled: !!id, queryKey: getGetAppointmentByIdQueryKey(id!) },
  });

  const update = useUpdateAppointmentStatus({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAppointmentByIdQueryKey(id!) });
      },
      onError: () => Alert.alert("Error", "Could not update status."),
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const appt = data as any;
  if (!appt) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.destructive }}>Appointment not found</Text>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[appt.status] || colors.mutedForeground;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top || 48, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Visit Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.statusCard, { backgroundColor: statusColor + "15", borderRadius: colors.radius }]}>
          <Feather name="calendar" size={28} color={statusColor} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>
            {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>DORM</Text>
          <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.dorm?.name || "—"}</Text>
          {appt.dorm?.address && (
            <View style={styles.iconRow}>
              <Feather name="map-pin" size={13} color={colors.mutedForeground} />
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>{appt.dorm.address}</Text>
            </View>
          )}
        </View>

        {user?.role === "owner" && appt.student && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>STUDENT</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.student.fullName}</Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>DATE & TIME</Text>
          <View style={styles.iconRow}>
            <Feather name="calendar" size={15} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.preferredDate}</Text>
          </View>
          <View style={styles.iconRow}>
            <Feather name="clock" size={15} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.preferredTime}</Text>
          </View>
        </View>

        {appt.message ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>MESSAGE FROM STUDENT</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.message}</Text>
          </View>
        ) : null}

        {appt.ownerNote ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>OWNER NOTE</Text>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.ownerNote}</Text>
          </View>
        ) : null}

        {user?.role === "owner" && appt.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10b981", borderRadius: colors.radius }]}
              onPress={() =>
                Alert.alert("Approve Visit?", "The student will be notified.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Approve",
                    onPress: () =>
                      update.mutate({ appointmentId, data: { status: "approved" } }),
                  },
                ])
              }
              disabled={update.isPending}
            >
              {update.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check" size={18} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#ef4444", borderRadius: colors.radius }]}
              onPress={() =>
                Alert.alert("Reject Visit?", "The student will be notified.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Reject",
                    style: "destructive",
                    onPress: () =>
                      update.mutate({ appointmentId, data: { status: "rejected" } }),
                  },
                ])
              }
              disabled={update.isPending}
            >
              {update.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="x" size={18} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  body: { padding: 16, gap: 12 },
  statusCard: { alignItems: "center", padding: 32, gap: 12 },
  statusLabel: { fontSize: 22, fontWeight: "bold" },
  card: { borderWidth: 1, padding: 16, gap: 8 },
  cardTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: "600" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sub: { fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
