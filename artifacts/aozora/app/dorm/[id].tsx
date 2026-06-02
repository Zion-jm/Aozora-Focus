import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useVerificationGate } from "@/hooks/useVerificationGate";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ReportModal } from "@/components/ReportModal";
import { useQuery } from "@tanstack/react-query";
import {
  getGetDormByIdQueryKey,
  useGetDormById,
  getCheckFavoriteQueryKey,
  useCheckFavorite,
  useAddFavorite,
  useRemoveFavorite,
  getGetFavoritesQueryKey,
  useCreateAppointment,
  getGetAppointmentsQueryKey,
  useCreateConversation,
  getGetConversationsQueryKey,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM",
  "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
];

function toDateValue(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatSelectedDate(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  return `${dayName}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

type CalendarProps = {
  selectedValue: string;
  onSelect: (value: string) => void;
  colors: any;
};

function InlineCalendar({ selectedValue, onSelect, colors }: CalendarProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewYear, setViewYear] = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={[calStyles.wrapper, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
      {/* Month navigation */}
      <View style={calStyles.header}>
        <TouchableOpacity
          onPress={prevMonth}
          style={[calStyles.navBtn, !canGoPrev && { opacity: 0.25 }]}
          disabled={!canGoPrev}
        >
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[calStyles.monthLabel, { color: colors.foreground }]}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Week day headers */}
      <View style={calStyles.weekRow}>
        {WEEK_DAYS.map((wd) => (
          <Text key={wd} style={[calStyles.weekDay, { color: colors.mutedForeground }]}>{wd}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={calStyles.grid}>
        {cells.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={calStyles.cell} />;
          }
          const cellDate = new Date(viewYear, viewMonth, day);
          cellDate.setHours(0, 0, 0, 0);
          const isPast = cellDate <= today;
          const value = toDateValue(viewYear, viewMonth, day);
          const isSelected = selectedValue === value;
          const isToday = cellDate.getTime() === today.getTime();

          return (
            <TouchableOpacity
              key={value}
              onPress={() => !isPast && onSelect(value)}
              disabled={isPast}
              style={[
                calStyles.cell,
                isSelected && { backgroundColor: colors.primary, borderRadius: 100 },
                isToday && !isSelected && { borderRadius: 100, borderWidth: 1.5, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  calStyles.dayText,
                  { color: isPast ? colors.mutedForeground : colors.foreground },
                  isSelected && { color: "#fff", fontWeight: "700" },
                  isPast && { opacity: 0.35 },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function DormDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [visitMessage, setVisitMessage] = useState("");

  const [showMsgModal, setShowMsgModal] = useState(false);
  const [initialMsg, setInitialMsg] = useState("");
  const [showReport, setShowReport] = useState(false);

  const { data: dorm, isLoading } = useGetDormById(id!, {
    query: { enabled: !!id, queryKey: getGetDormByIdQueryKey(id!) },
  });

  const dormIdNum = Number(id);

  const { requireVerified } = useVerificationGate();

  const { data: favData } = useCheckFavorite(dormIdNum, {
    query: { enabled: !!id && !!user, queryKey: getCheckFavoriteQueryKey(dormIdNum) },
  });
  const isFavorited = (favData as any)?.isFavorited ?? false;

  const addFav = useAddFavorite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(dormIdNum) });
        qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
      },
    },
  });
  const removeFav = useRemoveFavorite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(dormIdNum) });
        qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
      },
    },
  });

  const canBookKey = ["canBook", dormIdNum];
  const { data: canBookData, refetch: refetchCanBook } = useQuery({
    queryKey: canBookKey,
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/dorms/${dormIdNum}/can-book`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token && !!dormIdNum && user?.role === "student",
  });
  const canBook: boolean = canBookData?.canBook ?? true;
  const canBookReason: string | undefined = canBookData?.reason;
  const activeApptStatus: string | undefined = canBookData?.appointmentStatus;

  const createAppt = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        refetchCanBook();
        setShowBookModal(false);
        setSelectedDate("");
        setSelectedTime("");
        setVisitMessage("");
        toast.success("Visit Requested!", "The owner will review your request.");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Could not book visit. Try again.";
        toast.error("Booking Failed", msg);
      },
    },
  });

  const createConvo = useCreateConversation({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        setShowMsgModal(false);
        setInitialMsg("");
        router.push(`/conversation/${data.conversation?.id || data.id}`);
      },
      onError: () => toast.error("Error", "Could not start conversation."),
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dorm) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.destructive }}>Dorm not found</Text>
      </View>
    );
  }

  const d = dorm as any;
  const amenities: string[] = typeof d.amenities === "string"
    ? JSON.parse(d.amenities || "[]")
    : (d.amenities || []);
  const canSubmit = !!selectedDate && !!selectedTime;

  const photos: string[] = (() => {
    const urls: string[] = [];
    if (d.coverPhotoUrl) urls.push(d.coverPhotoUrl);
    const extra: Array<{ url: string; order: number }> = (d.photos ?? []);
    const sorted = [...extra].sort((a, b) => a.order - b.order);
    for (const p of sorted) {
      if (p.url && !urls.includes(p.url)) urls.push(p.url);
    }
    if (urls.length === 0) {
      urls.push("https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800");
    }
    return urls;
  })();

  function handlePhotoScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setPhotoIndex(idx);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.imageContainer}>
          {/* Swipeable photo carousel */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
            scrollEventThrottle={16}
            bounces={false}
            style={{ width: SCREEN_W, height: 280 }}
          >
            {photos.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={{ width: SCREEN_W, height: 280, backgroundColor: "#e2e8f0" }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === photoIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Photo count pill */}
          {photos.length > 1 && (
            <View style={styles.countPill} pointerEvents="none">
              <Feather name="image" size={11} color="#fff" />
              <Text style={styles.countText}>{photoIndex + 1} / {photos.length}</Text>
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>

          {/* Report button */}
          {user && user.id !== (d as any)?.owner?.id && (
            <TouchableOpacity
              style={[styles.reportBtn, { backgroundColor: colors.card }]}
              onPress={() => requireVerified(() => setShowReport(true))}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Feather name="flag" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}

          {/* Favorite button */}
          {user && (
            <TouchableOpacity
              style={[styles.favBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                if (isFavorited) removeFav.mutate({ dormId: dormIdNum });
                else addFav.mutate({ data: { dormId: dormIdNum } });
              }}
            >
              <AntDesign
                name={isFavorited ? "heart" : "hearto"}
                size={22}
                color={isFavorited ? "#ef4444" : colors.foreground}
              />
            </TouchableOpacity>
          )}
        </View>

        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          targetType="dorm"
          targetId={dormIdNum}
          targetLabel={(d as any)?.name}
          token={token}
          colors={colors}
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>{d.name}</Text>
            <View style={[styles.availBadge, { backgroundColor: d.availableBeds > 0 ? "#10b98120" : "#ef444420" }]}>
              <Text style={[styles.availText, { color: d.availableBeds > 0 ? "#10b981" : "#ef4444" }]}>
                {d.availableBeds > 0 ? `${d.availableBeds} beds` : "Full"}
              </Text>
            </View>
          </View>

          <Text style={[styles.price, { color: colors.primary }]}>
            ₱{Number(d.monthlyRent).toLocaleString()}
            <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}>/month</Text>
          </Text>

          <View style={styles.locationRow}>
            <Feather name="map-pin" size={15} color={colors.mutedForeground} />
            <Text style={[styles.address, { color: colors.mutedForeground }]}>{d.address}</Text>
          </View>

          {d.averageRating ? (
            <View style={styles.ratingRow}>
              <Feather name="star" size={15} color="#eab308" />
              <Text style={[styles.ratingText, { color: colors.foreground }]}>
                {Number(d.averageRating).toFixed(1)} ({d.totalReviews} reviews)
              </Text>
            </View>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {d.description ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{d.description}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          ) : null}

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{d.totalRooms}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Rooms</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{d.bedsPerRoom}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Beds/Room</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.secondary, borderRadius: colors.radius }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{d.availableBeds}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Available</Text>
            </View>
          </View>

          {amenities.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Amenities</Text>
              <View style={styles.amenitiesWrap}>
                {amenities.map((a: string, i: number) => (
                  <View key={i} style={[styles.chip, { backgroundColor: colors.primary + "18", borderRadius: 20 }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {d.owner && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Owner</Text>
              <View style={[styles.ownerCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <UserAvatar
                  name={user?.id === d.owner.id ? (user?.fullName ?? d.owner.fullName) : d.owner.fullName}
                  avatarUrl={user?.id === d.owner.id ? (user?.avatarUrl ?? (d.owner as any).avatarUrl) : (d.owner as any).avatarUrl}
                  size={48}
                  color={colors.primary}
                  backgroundColor={colors.primary + "22"}
                  userId={d.owner.id}
                />
                <View>
                  <Text style={[styles.ownerName, { color: colors.foreground }]}>
                    {user?.id === d.owner.id ? (user?.fullName ?? d.owner.fullName) : d.owner.fullName}
                  </Text>
                  {d.owner.verificationStatus === "verified" && (
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                      <Text style={[styles.verifiedText, { color: "#10b981" }]}>Verified Owner</Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        <ReviewsSection
          type="dorm"
          targetId={d.id}
          token={token}
          colors={colors}
        />
        <View style={{ height: 16 }} />
      </ScrollView>

      {user && user.role === "student" && (
        <View
          style={[
            styles.ctaBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 20 },
          ]}
        >
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => requireVerified(() => setShowMsgModal(true))}
          >
            <Feather name="message-circle" size={18} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Message</Text>
          </TouchableOpacity>
          {canBook ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={() => requireVerified(() => setShowBookModal(true))}
            >
              <Feather name="calendar" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Book a Visit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: activeApptStatus === "approved" ? "#10b981" : "#f59e0b", borderRadius: colors.radius, opacity: 0.85 }]}
              onPress={() => showConfirm({
                title: activeApptStatus === "approved" ? "Visit Scheduled" : "Visit Pending",
                message: canBookReason ?? "You already have an active booking for this dorm.",
                confirmLabel: "View Booking",
                cancelLabel: "OK",
                icon: activeApptStatus === "approved" ? "check-circle" : "clock",
                onConfirm: () => router.push("/(tabs)/appointments"),
              })}
              activeOpacity={0.85}
            >
              <Feather name={activeApptStatus === "approved" ? "check-circle" : "clock"} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {activeApptStatus === "approved" ? "Visit Scheduled" : "Visit Pending"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Message Modal */}
      <Modal visible={showMsgModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Message Owner</Text>
            <TouchableOpacity onPress={() => { setShowMsgModal(false); setInitialMsg(""); }}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={[styles.modalDorm, { color: colors.mutedForeground }]}>{d.name}</Text>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Your message *</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="Hi, I'm interested in this dorm..."
              placeholderTextColor={colors.mutedForeground}
              value={initialMsg}
              onChangeText={setInitialMsg}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }, !initialMsg.trim() && { opacity: 0.5 }]}
              disabled={!initialMsg.trim() || createConvo.isPending}
              onPress={() => createConvo.mutate({ data: { dormId: Number(id), initialMessage: initialMsg.trim() } })}
            >
              {createConvo.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Send Message</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Book a Visit Modal */}
      <Modal visible={showBookModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Book a Visit</Text>
            <TouchableOpacity onPress={() => setShowBookModal(false)}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalDorm, { color: colors.mutedForeground }]}>{d.name}</Text>

            {/* ── Calendar date picker ── */}
            <View style={styles.pickerSection}>
              <View style={styles.pickerLabelRow}>
                <Feather name="calendar" size={16} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 0 }]}>Select Date</Text>
                {selectedDate
                  ? <Text style={[styles.selectedBadge, { color: colors.primary, backgroundColor: colors.primary + "18" }]}>{formatSelectedDate(selectedDate)}</Text>
                  : <Text style={[styles.requiredBadge, { color: "#ef4444" }]}>required</Text>}
              </View>
              <InlineCalendar
                selectedValue={selectedDate}
                onSelect={setSelectedDate}
                colors={colors}
              />
            </View>

            {/* ── Time slot grid ── */}
            <View style={styles.pickerSection}>
              <View style={styles.pickerLabelRow}>
                <Feather name="clock" size={16} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 0 }]}>Select Time</Text>
                {selectedTime
                  ? <Text style={[styles.selectedBadge, { color: colors.primary, backgroundColor: colors.primary + "18" }]}>{selectedTime}</Text>
                  : <Text style={[styles.requiredBadge, { color: "#ef4444" }]}>required</Text>}
              </View>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTime === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      onPress={() => setSelectedTime(slot)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.card,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderRadius: colors.radius,
                        },
                      ]}
                    >
                      <Text style={[styles.timeChipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Optional message ── */}
            <View style={styles.pickerSection}>
              <View style={styles.pickerLabelRow}>
                <Feather name="message-square" size={16} color={colors.primary} />
                <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 0 }]}>
                  Message{" "}
                  <Text style={{ color: colors.mutedForeground, fontWeight: "400" }}>(optional)</Text>
                </Text>
              </View>
              <TextInput
                style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
                placeholder="Any questions or notes for the owner?"
                placeholderTextColor={colors.mutedForeground}
                value={visitMessage}
                onChangeText={setVisitMessage}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }, !canSubmit && { opacity: 0.4 }]}
              disabled={!canSubmit || createAppt.isPending}
              onPress={() =>
                createAppt.mutate({
                  data: { dormId: Number(id), preferredDate: selectedDate, preferredTime: selectedTime, message: visitMessage },
                })
              }
            >
              {createAppt.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>Send Request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageContainer: { position: "relative", height: 280, overflow: "hidden" },
  dotsRow: { position: "absolute", bottom: 12, left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 18, backgroundColor: "#fff" },
  dotInactive: { width: 6, backgroundColor: "rgba(255,255,255,0.5)" },
  countPill: { position: "absolute", bottom: 12, right: 14, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  countText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  backBtn: { position: "absolute", top: 48, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  favBtn: { position: "absolute", top: 48, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  reportBtn: { position: "absolute", top: 96, right: 16, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  content: { padding: 20 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "bold", flex: 1, marginRight: 12 },
  availBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  availText: { fontSize: 12, fontWeight: "600" },
  price: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  pricePeriod: { fontSize: 16, fontWeight: "normal" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  address: { fontSize: 15, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  ratingText: { fontSize: 15 },
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 24 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 16, alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "bold" },
  statLabel: { fontSize: 12, marginTop: 4 },
  amenitiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, fontWeight: "500" },
  ownerCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderWidth: 1 },
  ownerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  ownerAvatarText: { fontSize: 22, fontWeight: "bold" },
  ownerName: { fontSize: 16, fontWeight: "600" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  verifiedText: { fontSize: 12, fontWeight: "500" },
  ctaBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, padding: 16, paddingTop: 12, borderTopWidth: 1 },
  secondaryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 16, fontWeight: "600" },
  primaryBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  modalBody: { padding: 20 },
  modalDorm: { fontSize: 15, marginBottom: 20 },
  fieldLabel: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, padding: 14, fontSize: 15, marginBottom: 16 },
  textarea: { height: 90, textAlignVertical: "top" },
  submitBtn: { paddingVertical: 16, alignItems: "center", marginTop: 4, marginBottom: 40 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  pickerSection: { marginBottom: 24 },
  pickerLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  selectedBadge: { fontSize: 12, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  requiredBadge: { fontSize: 12, fontWeight: "500" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, minWidth: 90, alignItems: "center" },
  timeChipText: { fontSize: 14, fontWeight: "600" },
});

const calStyles = StyleSheet.create({
  wrapper: { borderWidth: 1, padding: 12, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 16, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", paddingVertical: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.2857%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 14 },
});
