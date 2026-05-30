import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
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

export default function DormDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showBookModal, setShowBookModal] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [visitMessage, setVisitMessage] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");

  const { data: dorm, isLoading } = useGetDormById(id!, {
    query: { enabled: !!id, queryKey: getGetDormByIdQueryKey(id!) },
  });

  const { data: favData } = useCheckFavorite(id!, {
    query: { enabled: !!id && !!user, queryKey: getCheckFavoriteQueryKey(id!) },
  });
  const isFavorited = (favData as any)?.isFavorited ?? false;

  const addFav = useAddFavorite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id!) });
        qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
      },
    },
  });
  const removeFav = useRemoveFavorite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getCheckFavoriteQueryKey(id!) });
        qc.invalidateQueries({ queryKey: getGetFavoritesQueryKey() });
      },
    },
  });

  const createAppt = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetAppointmentsQueryKey() });
        setShowBookModal(false);
        Alert.alert("Visit Requested!", "The owner will review your request.");
      },
      onError: () => Alert.alert("Error", "Could not book visit. Try again."),
    },
  });

  const createConvo = useCreateConversation({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        setShowMessageModal(false);
        setInitialMessage("");
        router.push(`/conversation/${data.conversation?.id || data.id}`);
      },
      onError: () => Alert.alert("Error", "Could not start conversation."),
    },
  });

  const handleStartConversation = () => {
    if (!initialMessage.trim()) return;
    createConvo.mutate({ data: { dormId: Number(id), initialMessage: initialMessage.trim() } });
  };

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
  const amenities: string[] = typeof d.amenities === "string" ? JSON.parse(d.amenities || "[]") : (d.amenities || []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: d.coverPhotoUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800",
            }}
            style={styles.coverImage}
          />
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </TouchableOpacity>
          {user && (
            <TouchableOpacity
              style={[styles.favBtn, { backgroundColor: colors.card }]}
              onPress={() => {
                if (isFavorited) {
                  removeFav.mutate({ dormId: id! });
                } else {
                  addFav.mutate({ data: { dormId: Number(id) } });
                }
              }}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={22}
                color={isFavorited ? "#ef4444" : colors.foreground}
              />
            </TouchableOpacity>
          )}
        </View>

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
                <View style={[styles.ownerAvatar, { backgroundColor: colors.primary + "22" }]}>
                  <Text style={[styles.ownerAvatarText, { color: colors.primary }]}>
                    {(d.owner.fullName || "O")[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.ownerName, { color: colors.foreground }]}>{d.owner.fullName}</Text>
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
        </View>
      </ScrollView>

      {user && user.role === "student" && (
        <View
          style={[
            styles.ctaBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom || 20,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => setShowMessageModal(true)}
            disabled={createConvo.isPending}
          >
            <Feather name="message-circle" size={18} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => setShowBookModal(true)}
          >
            <Feather name="calendar" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Book a Visit</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showMessageModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Message Owner</Text>
            <TouchableOpacity onPress={() => { setShowMessageModal(false); setInitialMessage(""); }}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.modalDorm, { color: colors.mutedForeground }]}>{d.name}</Text>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Your Message *</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="Hi! I'm interested in your dorm listing…"
              placeholderTextColor={colors.mutedForeground}
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                !initialMessage.trim() && { opacity: 0.5 },
              ]}
              disabled={!initialMessage.trim() || createConvo.isPending}
              onPress={handleStartConversation}
            >
              {createConvo.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showBookModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Book a Visit</Text>
            <TouchableOpacity onPress={() => setShowBookModal(false)}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={[styles.modalDorm, { color: colors.mutedForeground }]}>{d.name}</Text>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Preferred Date *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="e.g. 2026-06-15"
              placeholderTextColor={colors.mutedForeground}
              value={preferredDate}
              onChangeText={setPreferredDate}
            />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Preferred Time *</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="e.g. 10:00 AM"
              placeholderTextColor={colors.mutedForeground}
              value={preferredTime}
              onChangeText={setPreferredTime}
            />
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Message (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: colors.radius }]}
              placeholder="Any questions or notes for the owner?"
              placeholderTextColor={colors.mutedForeground}
              value={visitMessage}
              onChangeText={setVisitMessage}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, borderRadius: colors.radius },
                (!preferredDate || !preferredTime) && { opacity: 0.5 },
              ]}
              disabled={!preferredDate || !preferredTime || createAppt.isPending}
              onPress={() => {
                createAppt.mutate({
                  data: {
                    dormId: Number(id),
                    preferredDate,
                    preferredTime,
                    message: visitMessage,
                  },
                });
              }}
            >
              {createAppt.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Request</Text>
              )}
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
  imageContainer: { position: "relative" },
  coverImage: { width: "100%", height: 280, backgroundColor: "#e2e8f0" },
  backBtn: { position: "absolute", top: 48, left: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
  favBtn: { position: "absolute", top: 48, right: 16, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3 },
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
  textarea: { height: 100, textAlignVertical: "top" },
  submitBtn: { paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  submitBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
