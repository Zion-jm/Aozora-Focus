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
import { ReviewsSection } from "@/components/ReviewsSection";
import { UserAvatar } from "@/components/UserAvatar";
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
  cancelled: "#6b7280",
  noted: "#8b5cf6",
  completed: "#0ea5e9",
  no_show: "#f97316",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "clock",
  approved: "check-circle",
  rejected: "x-circle",
  cancelled: "slash",
  noted: "check-square",
  completed: "award",
  no_show: "user-x",
};

export default function AppointmentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const qc = useQueryClient();

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
  const statusIcon = STATUS_ICONS[appt.status] || "calendar";
  const isApproved = appt.status === "approved";
  const isCancelled = appt.status === "cancelled";
  const isPending = appt.status === "pending";
  const isCompleted = appt.status === "completed";
  const isNoShow = appt.status === "no_show";

  const statusLabel =
    appt.status === "cancelled" ? "Cancelled"
    : appt.status === "noted" ? "Noted by Owner"
    : appt.status === "no_show" ? "No-Show"
    : appt.status === "completed" ? "Visit Completed"
    : appt.status.charAt(0).toUpperCase() + appt.status.slice(1);

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
        {/* Status banner */}
        <View style={[styles.statusCard, { backgroundColor: statusColor + "15", borderRadius: colors.radius }]}>
          <Feather name={statusIcon as any} size={28} color={statusColor} />
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          {isCancelled && user?.role === "student" && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              Waiting for the owner to acknowledge
            </Text>
          )}
          {isCancelled && user?.role === "owner" && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              Student cancelled this visit
            </Text>
          )}
          {isApproved && user?.role === "student" && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              Your visit is confirmed — attend to unlock the review form
            </Text>
          )}
          {isApproved && user?.role === "owner" && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              After the visit, mark it as completed or record a no-show below
            </Text>
          )}
          {isNoShow && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              The student did not show up for this visit
            </Text>
          )}
          {isCompleted && (
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              {user?.role === "student"
                ? "You can now leave a review for this dorm"
                : "You can now leave a review for this student"}
            </Text>
          )}
        </View>

        {/* Dorm */}
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

        {/* Student info — visible to owners */}
        {user?.role === "owner" && appt.student && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>STUDENT</Text>
            <TouchableOpacity
              style={styles.studentRow}
              onPress={() => router.push(`/user/${appt.student.id}`)}
              activeOpacity={0.8}
            >
              <UserAvatar
                name={appt.student.fullName}
                avatarUrl={appt.student.avatarUrl}
                size={36}
                color={colors.primary}
                backgroundColor={colors.primary + "22"}
                userId={appt.student.id}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardValue, { color: colors.foreground }]}>{appt.student.fullName}</Text>
                {appt.student.verificationStatus === "verified" && (
                  <View style={styles.iconRow}>
                    <Feather name="check-circle" size={12} color="#10b981" />
                    <Text style={[styles.sub, { color: "#10b981" }]}>ID Verified</Text>
                  </View>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Date & time */}
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

        {/* Owner actions: approve / reject (pending only) */}
        {user?.role === "owner" && isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#10b981", borderRadius: colors.radius }]}
              onPress={() =>
                Alert.alert("Approve Visit?", "The student will be notified.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Approve",
                    onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "approved" } }),
                  },
                ])
              }
              disabled={update.isPending}
            >
              <Feather name="check" size={18} color="#fff" />
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
                    onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "rejected" } }),
                  },
                ])
              }
              disabled={update.isPending}
            >
              <Feather name="x" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Owner actions: mark completed / no-show (approved only) */}
        {user?.role === "owner" && isApproved && (
          <View style={[styles.outcomeBox, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={styles.outcomeHeader}>
              <Feather name="clipboard" size={16} color={colors.mutedForeground} />
              <Text style={[styles.outcomeTitle, { color: colors.mutedForeground }]}>RECORD VISIT OUTCOME</Text>
            </View>
            <Text style={[styles.outcomeHint, { color: colors.mutedForeground }]}>
              After the visit date, record the outcome to unlock the review form.
            </Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#0ea5e9", borderRadius: colors.radius, flex: 1 }]}
                onPress={() =>
                  Alert.alert(
                    "Mark as Completed?",
                    "This confirms the student attended their visit. They will be able to leave a review.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Mark Completed",
                        onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "completed" } }),
                      },
                    ]
                  )
                }
                disabled={update.isPending}
              >
                {update.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="award" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Completed</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#f97316", borderRadius: colors.radius, flex: 1 }]}
                onPress={() =>
                  Alert.alert(
                    "Mark as No-Show?",
                    "This records that the student did not attend. The review form will remain locked.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Mark No-Show",
                        style: "destructive",
                        onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "no_show" } }),
                      },
                    ]
                  )
                }
                disabled={update.isPending}
              >
                {update.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="user-x" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>No-Show</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Owner action: mark as noted (when student cancelled) */}
        {user?.role === "owner" && isCancelled && (
          <TouchableOpacity
            style={[styles.notedBtn, { backgroundColor: "#8b5cf6" + "18", borderColor: "#8b5cf6" + "50", borderRadius: colors.radius }]}
            onPress={() =>
              Alert.alert(
                "Mark as Noted?",
                "This acknowledges that you've seen the cancellation.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Mark as Noted",
                    onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "noted" } }),
                  },
                ]
              )
            }
            disabled={update.isPending}
            activeOpacity={0.8}
          >
            {update.isPending ? (
              <ActivityIndicator size="small" color="#8b5cf6" />
            ) : (
              <>
                <Feather name="check-square" size={18} color="#8b5cf6" />
                <Text style={[styles.notedBtnText, { color: "#8b5cf6" }]}>Mark as Noted</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Student action: cancel (pending or approved only) */}
        {user?.role === "student" && (isPending || isApproved) && (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.destructive + "60", borderRadius: colors.radius }]}
            onPress={() =>
              Alert.alert(
                "Cancel Visit?",
                "The owner will be notified of your cancellation.",
                [
                  { text: "Keep Visit", style: "cancel" },
                  {
                    text: "Cancel Visit",
                    style: "destructive",
                    onPress: () => update.mutate({ appointmentId: Number(id!), data: { status: "cancelled" } }),
                  },
                ]
              )
            }
            disabled={update.isPending}
            activeOpacity={0.8}
          >
            {update.isPending ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <>
                <Feather name="slash" size={16} color={colors.destructive} />
                <Text style={[styles.cancelBtnText, { color: colors.destructive }]}>Cancel Visit</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* No-show notice — review is permanently locked */}
        {isNoShow && (
          <View style={[styles.lockedNotice, { backgroundColor: "#f9731610", borderColor: "#f9731640", borderRadius: colors.radius }]}>
            <Feather name="lock" size={16} color="#f97316" />
            <Text style={[styles.lockedNoticeText, { color: "#f97316" }]}>
              Reviews are not available for no-show visits
            </Text>
          </View>
        )}

        {/* Review sections — only available after visit is completed */}
        {isCompleted && user?.role === "student" && appt.dorm?.id && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ReviewsSection
              type="dorm"
              targetId={appt.dorm.id}
              token={token}
              colors={colors}
            />
          </>
        )}

        {isCompleted && user?.role === "owner" && appt.student?.id && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <ReviewsSection
              type="user"
              targetId={appt.student.id}
              token={token}
              colors={colors}
            />
          </>
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
  statusCard: { alignItems: "center", padding: 28, gap: 8 },
  statusLabel: { fontSize: 22, fontWeight: "bold" },
  statusHint: { fontSize: 13, textAlign: "center" },
  card: { borderWidth: 1, padding: 16, gap: 8 },
  cardTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: "600" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sub: { fontSize: 14 },
  studentRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  outcomeBox: { borderWidth: 1, padding: 16, gap: 12 },
  outcomeHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  outcomeTitle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
  outcomeHint: { fontSize: 13, lineHeight: 18 },
  cancelBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 1, marginTop: 4 },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  notedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 1, marginTop: 4 },
  notedBtnText: { fontSize: 15, fontWeight: "700" },
  lockedNotice: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1 },
  lockedNoticeText: { fontSize: 14, fontWeight: "600", flex: 1 },
  divider: { height: 1, marginVertical: 8 },
});
