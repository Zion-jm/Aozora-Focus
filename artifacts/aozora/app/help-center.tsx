import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const TICKET_TYPES = [
  { value: "Appeal Suspension", label: "Appeal Suspension", icon: "user-x" as const, color: "#ef4444" },
  { value: "Report a Technical Bug", label: "Report a Technical Bug", icon: "tool" as const, color: "#f97316" },
  { value: "General Question", label: "General Question", icon: "help-circle" as const, color: "#0ea5e9" },
  { value: "Payment/Listing Help", label: "Payment / Listing Help", icon: "home" as const, color: "#10b981" },
  { value: "Other", label: "Other", icon: "more-horizontal" as const, color: "#8b5cf6" },
];

export default function HelpCenterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const params = useLocalSearchParams<{ type?: string }>();

  const defaultType = params.type
    ? TICKET_TYPES.find((t) => t.value.toLowerCase().replace(/\s+/g, "_") === params.type?.toLowerCase())?.value ?? ""
    : "";

  const [ticketType, setTicketType] = useState(defaultType);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [checkingExisting, setCheckingExisting] = useState(false);
  const [activeTicket, setActiveTicket] = useState<{ id: number; subject: string; conversationId: number | null } | null>(null);

  const isGuest = !user || !token;
  const isAdmin = user?.role === "admin";
  const selectedType = TICKET_TYPES.find((t) => t.value === ticketType);

  // Check for existing pending ticket (authenticated non-admin users only)
  useEffect(() => {
    if (!token || isAdmin || isGuest) return;
    setCheckingExisting(true);
    fetch(`${BASE_URL}/api/support-tickets/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const pending = (data.tickets ?? []).find((t: any) => t.status === "pending");
        if (pending) {
          setActiveTicket({ id: pending.id, subject: pending.subject, conversationId: pending.conversationId });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false));
  }, [token, isAdmin, isGuest]);

  const handleSubmit = async () => {
    if (activeTicket) return;
    if (!ticketType) { Alert.alert("Required", "Please select a ticket type."); return; }
    if (!subject.trim()) { Alert.alert("Required", "Please enter a subject."); return; }
    if (!message.trim()) { Alert.alert("Required", "Please enter a message."); return; }
    if (isGuest && !guestName.trim()) { Alert.alert("Required", "Please enter your name."); return; }
    if (isGuest && !guestEmail.trim()) { Alert.alert("Required", "Please enter your email."); return; }

    setIsSubmitting(true);
    try {
      let res: Response;
      if (isGuest) {
        res = await fetch(`${BASE_URL}/api/support-tickets/public`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestName: guestName.trim(), guestEmail: guestEmail.trim(), ticketType, subject: subject.trim(), message: message.trim() }),
        });
      } else {
        res = await fetch(`${BASE_URL}/api/support-tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ticketType, subject: subject.trim(), message: message.trim() }),
        });
      }

      if (res.status === 409) {
        const existingTickets = await fetch(`${BASE_URL}/api/support-tickets/my`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()).catch(() => ({ tickets: [] }));
        const pending = (existingTickets.tickets ?? []).find((t: any) => t.status === "pending");
        setActiveTicket(pending
          ? { id: pending.id, subject: pending.subject, conversationId: pending.conversationId }
          : { id: 0, subject: subject.trim(), conversationId: null }
        );
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to submit ticket");
      }

      const data = await res.json().catch(() => ({}));
      if (!isGuest && data.conversationId) {
        setActiveTicket({ id: data.ticketId, subject: subject.trim(), conversationId: data.conversationId });
      }
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not submit your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Admin: not allowed ──────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Center</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.blockedContainer}>
          <View style={[styles.blockedIcon, { backgroundColor: colors.muted }]}>
            <Feather name="shield" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.blockedTitle, { color: colors.foreground }]}>Not Available</Text>
          <Text style={[styles.blockedSub, { color: colors.mutedForeground }]}>
            Support tickets are for users and owners only. As an admin, you manage the ticket queue directly.
          </Text>
          <TouchableOpacity
            style={[styles.adminTicketsBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={() => router.push("/admin/support-tickets")}
            activeOpacity={0.85}
          >
            <Feather name="inbox" size={16} color="#fff" />
            <Text style={styles.adminTicketsBtnText}>Go to Support Queue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loading check ────────────────────────────────────────────────────────────
  if (checkingExisting) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Center</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // ── Already has an active ticket ─────────────────────────────────────────────
  if (activeTicket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Center</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.blockedContainer}>
          <View style={[styles.blockedIcon, { backgroundColor: "#f9731618" }]}>
            <Feather name="clock" size={36} color="#f97316" />
          </View>
          <Text style={[styles.blockedTitle, { color: colors.foreground }]}>Active Ticket Pending</Text>
          <Text style={[styles.blockedSub, { color: colors.mutedForeground }]}>
            You already have an open support request. Please wait for it to be resolved before submitting a new one.
          </Text>
          <View style={[styles.activeTicketCard, { backgroundColor: colors.card, borderColor: "#f97316" + "50" }]}>
            <View style={[styles.activeTicketBadge, { backgroundColor: "#f97316" }]}>
              <Text style={styles.activeTicketBadgeText}>OPEN</Text>
            </View>
            <Text style={[styles.activeTicketSubject, { color: colors.foreground }]} numberOfLines={2}>
              {activeTicket.subject}
            </Text>
          </View>
          {activeTicket.conversationId ? (
            <TouchableOpacity
              style={[styles.adminTicketsBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
              onPress={() => router.push(`/admin-conversation/${activeTicket.conversationId}`)}
              activeOpacity={0.85}
            >
              <Feather name="message-circle" size={16} color="#fff" />
              <Text style={styles.adminTicketsBtnText}>View Ticket Thread</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.myTicketsBtn, { borderColor: colors.border, borderRadius: colors.radius }]}
            onPress={() => router.push("/my-tickets")}
            activeOpacity={0.8}
          >
            <Text style={[styles.myTicketsBtnText, { color: colors.foreground }]}>See All My Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Success — show confirmation + active ticket card ─────────────────────────
  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Center</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={[styles.successScroll, { paddingBottom: insets.bottom + 40 }]}>
          {/* Confirmation banner */}
          <View style={[styles.confirmBanner, { backgroundColor: "#10b98112", borderColor: "#10b98130" }]}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#10b98120" }]}>
              <Feather name="check-circle" size={36} color="#10b981" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Ticket Submitted!</Text>
            <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
              {isGuest
                ? "Your request has been submitted. Our team will reach out to you via email."
                : "Your support ticket has been received. A dedicated thread has been created in your Messages."}
            </Text>
          </View>

          {/* Active ticket card */}
          {activeTicket && (
            <View style={[styles.pendingSection, { borderColor: colors.border }]}>
              <Text style={[styles.pendingSectionLabel, { color: colors.mutedForeground }]}>YOUR ACTIVE TICKET</Text>
              <View style={[styles.pendingCard, { backgroundColor: colors.card, borderColor: "#f9731640" }]}>
                <View style={styles.pendingCardTop}>
                  <View style={[styles.openBadge, { backgroundColor: "#f97316" }]}>
                    <Text style={styles.openBadgeText}>OPEN</Text>
                  </View>
                  <View style={styles.pendingDot} />
                  <Text style={[styles.pendingWaiting, { color: colors.mutedForeground }]}>Awaiting admin response</Text>
                </View>
                <Text style={[styles.pendingSubject, { color: colors.foreground }]} numberOfLines={2}>
                  {activeTicket.subject}
                </Text>
                {activeTicket.conversationId && (
                  <TouchableOpacity
                    style={[styles.openThreadBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                    onPress={() => router.push(`/admin-conversation/${activeTicket.conversationId}`)}
                    activeOpacity={0.85}
                  >
                    <Feather name="message-circle" size={16} color="#fff" />
                    <Text style={styles.openThreadBtnText}>Open Ticket Thread</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.myTicketsLink, { borderColor: colors.border, borderRadius: colors.radius }]}
                onPress={() => router.push("/my-tickets")}
                activeOpacity={0.8}
              >
                <Feather name="inbox" size={15} color={colors.foreground} />
                <Text style={[styles.myTicketsLinkText, { color: colors.foreground }]}>See All My Tickets</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Done */}
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: isGuest || !activeTicket ? colors.primary : colors.secondary, borderRadius: colors.radius, marginHorizontal: 24 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneBtnText, { color: isGuest || !activeTicket ? "#fff" : colors.foreground }]}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Help Center</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.introBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Feather name="life-buoy" size={20} color={colors.primary} />
          <Text style={[styles.introText, { color: colors.foreground }]}>
            {isGuest ? "Submit a support request. Our admin team will respond via email." : "Submit a support ticket and our admin team will respond in your Messages."}
          </Text>
        </View>

        {isGuest && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Your Name</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="Full name"
              placeholderTextColor={colors.mutedForeground}
              value={guestName}
              onChangeText={setGuestName}
            />
            <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={guestEmail}
              onChangeText={setGuestEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={[styles.label, { color: colors.foreground }]}>Ticket Type <Text style={{ color: "#ef4444" }}>*</Text></Text>
        <TouchableOpacity
          style={[styles.picker, { borderColor: selectedType ? selectedType.color + "60" : colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
          onPress={() => setShowTypePicker(true)}
          activeOpacity={0.8}
        >
          {selectedType ? (
            <View style={styles.pickerSelected}>
              <View style={[styles.typeIconWrap, { backgroundColor: selectedType.color + "18" }]}>
                <Feather name={selectedType.icon} size={16} color={selectedType.color} />
              </View>
              <Text style={[styles.pickerText, { color: colors.foreground }]}>{selectedType.label}</Text>
            </View>
          ) : (
            <Text style={[styles.pickerText, { color: colors.mutedForeground }]}>Select a category…</Text>
          )}
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.foreground }]}>Subject <Text style={{ color: "#ef4444" }}>*</Text></Text>
        <TextInput
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Brief summary of your issue"
          placeholderTextColor={colors.mutedForeground}
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
        />

        <Text style={[styles.label, { color: colors.foreground }]}>Detailed Message <Text style={{ color: "#ef4444" }}>*</Text></Text>
        <TextInput
          style={[styles.textarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground, borderRadius: colors.radius }]}
          placeholder="Describe your issue in detail. Include any relevant context, dates, or account information."
          placeholderTextColor={colors.mutedForeground}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{message.length}/2000</Text>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isSubmitting ? colors.muted : colors.primary, borderRadius: colors.radius }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Ticket</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showTypePicker} transparent animationType="slide" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Ticket Type</Text>
            {TICKET_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.typeOption,
                  { borderColor: colors.border },
                  ticketType === t.value && { backgroundColor: t.color + "12", borderColor: t.color + "40" },
                ]}
                onPress={() => { setTicketType(t.value); setShowTypePicker(false); }}
                activeOpacity={0.75}
              >
                <View style={[styles.typeIconWrap, { backgroundColor: t.color + "18" }]}>
                  <Feather name={t.icon} size={18} color={t.color} />
                </View>
                <Text style={[styles.typeOptionText, { color: colors.foreground }]}>{t.label}</Text>
                {ticketType === t.value && <Feather name="check" size={18} color={t.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 6 },
  introBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  introText: { flex: 1, fontSize: 14, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textarea: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 140 },
  charCount: { fontSize: 12, textAlign: "right", marginTop: 4 },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 2 },
  pickerSelected: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickerText: { fontSize: 15 },
  typeIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 16 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  successScroll: { padding: 24, gap: 20 },
  confirmBanner: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
  confirmIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 22, fontWeight: "800" },
  confirmSub: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  pendingSection: { gap: 10 },
  pendingSectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  pendingCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 10 },
  pendingCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  openBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  pendingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#f97316" },
  pendingWaiting: { fontSize: 12 },
  pendingSubject: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
  openThreadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, marginTop: 2 },
  openThreadBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  myTicketsLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1 },
  myTicketsLinkText: { fontSize: 14, fontWeight: "600" },
  doneBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 40, marginTop: 4, width: "100%" },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 8 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  typeOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 2 },
  typeOptionText: { flex: 1, fontSize: 15 },
  blockedContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  blockedIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  blockedTitle: { fontSize: 22, fontWeight: "800" },
  blockedSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  adminTicketsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8, width: "100%" },
  adminTicketsBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  myTicketsBtn: { paddingVertical: 12, paddingHorizontal: 32, borderWidth: 1, width: "100%", alignItems: "center" },
  myTicketsBtnText: { fontSize: 15, fontWeight: "600" },
  activeTicketCard: { width: "100%", padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  activeTicketBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
  activeTicketBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  activeTicketSubject: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
});
