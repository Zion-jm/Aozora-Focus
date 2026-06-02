import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

function apiFetch(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
// SQLite stores "YYYY-MM-DD HH:MM:SS" with no timezone marker (UTC).
// Appending 'Z' makes JS parse it as UTC, then toLocaleTimeString()
// automatically converts to the device's local timezone.
function parseTs(ts: string): Date {
  if (!ts) return new Date();
  if (ts.includes("Z") || ts.includes("+") || (ts.includes("T") && ts.length > 19)) return new Date(ts);
  return new Date(ts.replace(" ", "T") + "Z");
}
function fmtTime(ts: string): string {
  return parseTs(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDivider(ts: string): string {
  const d = parseTs(ts);
  const now = new Date();
  const toDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((toDay(now) - toDay(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "long", day: "numeric", ...(diff > 365 ? { year: "numeric" } : {}) });
}
function sameDay(a: string, b: string): boolean {
  const da = parseTs(a); const db = parseTs(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

type ListItem =
  | { kind: "message"; data: any }
  | { kind: "divider"; label: string; id: string };

export default function AdminConversationScreen() {
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = parseInt(id || "0", 10);
  const { user, token } = useAuth();
  const flatRef = useRef<FlatList>(null);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [conversationType, setConversationType] = useState<"warning" | "support">("warning");
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fetchMessages = async () => {
    if (!token || !convId) return;
    try {
      const [msgsRes, convRes] = await Promise.all([
        apiFetch(`/api/admin-conversations/${convId}/messages`, token),
        apiFetch("/api/conversations", token),
      ]);

      if (msgsRes.ok) {
        const data = await msgsRes.json();
        setMessages(data.messages || []);
        setClosedAt(data.closedAt || null);
        setStartedAt(data.startedAt || null);
        if (data.conversationType) setConversationType(data.conversationType);
        if (data.ticket !== undefined) setTicketInfo(data.ticket || null);
      }

      if (convRes.ok) {
        const data = await convRes.json();
        const conv = (data.conversations || []).find((c: any) => c.type === "admin" && c.id === convId);
        if (conv) {
          setOtherUser(conv.otherParticipant);
          if (conv.closedAt) setClosedAt(conv.closedAt);
        }
      }

      await apiFetch(`/api/admin-conversations/${convId}/read`, token, { method: "POST" });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages().then(() => {
      setTimeout(() => flatRef.current?.scrollToOffset({ offset: 0, animated: false }), 50);
    });
  }, [convId, token]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [convId, token]);

  const handleDelete = () => {
    showConfirm({
      title: "Delete Conversation",
      message: "This will remove the conversation from your view.",
      confirmLabel: "Delete",
      destructive: true,
      icon: "trash-2",
      onConfirm: async () => {
        try {
          await apiFetch(`/api/admin-conversations/${convId}`, token!, { method: "DELETE" });
          router.back();
        } catch {
          toast.error("Error", "Could not delete conversation. Please try again.");
        }
      },
    });
  };

  const handleSend = async () => {
    if (!text.trim() || !token || isSending) return;
    setIsSending(true);
    try {
      const res = await apiFetch(`/api/admin-conversations/${convId}/messages`, token, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      if (res.ok) {
        setText("");
        await fetchMessages();
        flatRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const isOneWay = conversationType === "warning" && !isAdmin;
  const isClosed = !!closedAt;
  const isNotStarted = conversationType === "support" && !startedAt;

  // ID of the last message I sent that has been seen
  const lastReadSentId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user?.id && messages[i].isRead) return messages[i].id;
    }
    return -1;
  }, [messages, user?.id]);

  // Build list with date dividers (chronological), then reverse for inverted FlatList
  const listItems = useMemo((): ListItem[] => {
    const items: ListItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      if (!prev || !sameDay(prev.createdAt, msg.createdAt)) {
        items.push({ kind: "divider", label: fmtDivider(msg.createdAt), id: `div-${msg.createdAt}` });
      }
      items.push({ kind: "message", data: msg });
    }
    return [...items].reverse();
  }, [messages]);

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "divider") {
      return (
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerLabel, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
            {item.label}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>
      );
    }

    const msg = item.data;
    const isMe = msg.senderId === user?.id;
    const isLastReadSent = isMe && msg.id === lastReadSentId;
    const senderLabel = isMe
      ? "You"
      : (msg.sender?.fullName ?? otherUser?.fullName ?? (isAdmin ? "User" : "Aozora Support"));

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <UserAvatar
            name={msg.sender?.fullName ?? otherUser?.fullName}
            avatarUrl={msg.sender?.avatarUrl ?? otherUser?.avatarUrl}
            size={32}
            color={conversationType === "support" ? colors.primary : "#ef4444"}
            backgroundColor={conversationType === "support" ? colors.primary + "22" : "#ef444422"}
            userId={msg.sender?.id ?? otherUser?.id}
          />
        )}
        <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
          <Text style={[styles.senderLabel, isMe && styles.senderLabelMe, { color: colors.mutedForeground }]}>
            {senderLabel}
          </Text>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: isMe ? colors.primary : colors.card,
                borderRadius: colors.radius,
                borderBottomRightRadius: isMe ? 4 : colors.radius,
                borderBottomLeftRadius: isMe ? colors.radius : 4,
              },
            ]}
          >
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>
              {msg.content}
            </Text>
            <Text style={[styles.timeText, { color: isMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
              {fmtTime(msg.createdAt)}
            </Text>
          </View>
          {isLastReadSent && (
            <View style={styles.seenRow}>
              <Feather name="check-circle" size={11} color={colors.primary} />
              <Text style={[styles.seenText, { color: colors.primary }]}>Seen</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleStartConversation = async () => {
    if (!token || isStarting) return;
    setIsStarting(true);
    try {
      const res = await apiFetch(`/api/admin-conversations/${convId}/start`, token, { method: "POST" });
      if (res.ok) await fetchMessages();
      else toast.error("Error", "Could not start conversation. Please try again.");
    } catch {
      toast.error("Error", "Could not start conversation. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleTicketAction = () => {
    if (!ticketInfo || !isAdmin) return;
    const isPending = ticketInfo.status === "pending";
    showConfirm({
      title: ticketInfo.subject,
      message: `Type: ${ticketInfo.ticketType}\nStatus: ${isPending ? "Open" : "Resolved"}`,
      confirmLabel: isPending ? "Mark as Resolved" : "Reopen Ticket",
      cancelLabel: "Cancel",
      icon: isPending ? "check-circle" : "refresh-cw",
      onConfirm: async () => {
        try {
          const newStatus = isPending ? "resolved" : "pending";
          const res = await apiFetch(`/api/admin/support-tickets/${ticketInfo.id}`, token!, {
            method: "PATCH",
            body: JSON.stringify({ status: newStatus }),
          });
          if (res.ok) await fetchMessages();
        } catch {
          toast.error("Error", "Could not update ticket status.");
        }
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top || 48, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {conversationType === "support" && ticketInfo
              ? ticketInfo.subject
              : otherUser?.fullName || "…"}
          </Text>
          {!isAdmin && conversationType === "warning" && (
            <View style={styles.warningBadge}>
              <Ionicons name="shield" size={11} color="#ef4444" />
              <Text style={styles.warningBadgeText}>Official Notice</Text>
            </View>
          )}
          {!isAdmin && conversationType === "support" && (
            <View style={[styles.supportBadge, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="life-buoy" size={11} color={colors.primary} />
              <Text style={[styles.supportBadgeText, { color: colors.primary }]}>Support Ticket</Text>
            </View>
          )}
          {isAdmin && ticketInfo && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {ticketInfo.ticketType}
            </Text>
          )}
          {isAdmin && !ticketInfo && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {otherUser?.role ? otherUser.role.charAt(0).toUpperCase() + otherUser.role.slice(1) : ""}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* Warning banner for non-admins on a warning conv */}
      {!isAdmin && conversationType === "warning" && (
        <View style={[styles.warningBanner, { backgroundColor: "#ef444415", borderColor: "#ef444440" }]}>
          <View style={styles.warningBannerIcon}>
            <Ionicons name="shield" size={18} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.warningBannerTitle}>Official Notice from Aozora Admin</Text>
            <Text style={styles.warningBannerText}>
              This is a one-way channel. You cannot reply to official notices.
            </Text>
          </View>
        </View>
      )}

      {/* Support ticket info banner for admin — tap to resolve/reopen */}
      {isAdmin && ticketInfo && (
        <TouchableOpacity
          style={[styles.ticketBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}
          onPress={handleTicketAction}
          activeOpacity={0.75}
        >
          <Feather name="life-buoy" size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ticketBannerType, { color: colors.primary }]}>{ticketInfo.ticketType}</Text>
            <Text style={[styles.ticketBannerSubject, { color: colors.foreground }]}>{ticketInfo.subject}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={[styles.ticketStatusChip, { backgroundColor: ticketInfo.status === "resolved" ? "#10b98118" : "#f9731618" }]}>
              <Text style={[styles.ticketStatusText, { color: ticketInfo.status === "resolved" ? "#10b981" : "#f97316" }]}>
                {ticketInfo.status === "resolved" ? "Resolved" : "Open"}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "600" }}>Tap to update ›</Text>
          </View>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={listItems}
          keyExtractor={(item) => item.kind === "divider" ? item.id : `msg-${item.data.id}`}
          renderItem={renderItem}
          inverted
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={conversationType === "support" ? "help-circle-outline" : "shield-outline"}
                size={40}
                color={colors.mutedForeground}
              />
              <Text style={[{ color: colors.mutedForeground, fontSize: 15, marginTop: 12, textAlign: "center" }]}>
                {isAdmin
                  ? conversationType === "support"
                    ? "Start the support conversation."
                    : "Send a warning or notice to this user."
                  : conversationType === "support"
                  ? "Your ticket has been received. An admin will respond shortly."
                  : "No messages yet from admin."}
              </Text>
            </View>
          }
        />
      )}

      {/* Input area */}
      {isClosed ? (
        <View
          style={[
            styles.oneWayBar,
            { backgroundColor: "#10b98110", borderTopColor: "#10b98130", paddingBottom: insets.bottom || 16 },
          ]}
        >
          <Feather name="check-circle" size={16} color="#10b981" />
          <Text style={[styles.oneWayText, { color: "#10b981" }]}>
            {isAdmin
              ? "This ticket has been resolved. The thread is now read-only. Reopen the ticket to continue chatting."
              : "This ticket has been resolved and archived. If you need further assistance, please open a new ticket."}
          </Text>
        </View>
      ) : isAdmin && isNotStarted ? (
        <View
          style={[
            styles.startConvBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 16 },
          ]}
        >
          <View style={styles.startConvInfo}>
            <Feather name="message-circle" size={15} color={colors.primary} />
            <Text style={[styles.startConvText, { color: colors.mutedForeground }]}>
              Click below to open the chat with this user.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.startConvBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
            onPress={handleStartConversation}
            disabled={isStarting}
            activeOpacity={0.85}
          >
            {isStarting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="message-circle" size={16} color="#fff" />
                <Text style={styles.startConvBtnText}>Start Conversation</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : !isAdmin && isNotStarted ? (
        <View
          style={[
            styles.oneWayBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 16 },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.oneWayText, { color: colors.mutedForeground }]}>
            Waiting for an admin to review your ticket before the chat opens.
          </Text>
        </View>
      ) : isOneWay ? (
        <View
          style={[
            styles.oneWayBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 16 },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.oneWayText, { color: colors.mutedForeground }]}>
            This is a one-way official notice. You cannot reply to this message.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 16 },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
                borderRadius: colors.radius,
              },
            ]}
            placeholder={
              isAdmin
                ? conversationType === "support" ? "Reply to ticket…" : "Type a warning or message…"
                : "Reply to admin…"
            }
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() ? colors.primary : colors.muted, borderRadius: colors.radius },
            ]}
            onPress={handleSend}
            disabled={!text.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  warningBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  warningBadgeText: { color: "#ef4444", fontSize: 11, fontWeight: "600" },
  supportBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  supportBadgeText: { fontSize: 11, fontWeight: "600" },
  warningBanner: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  warningBannerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#ef444420", alignItems: "center", justifyContent: "center", marginTop: 1 },
  warningBannerTitle: { fontSize: 13, fontWeight: "700", color: "#ef4444", marginBottom: 2 },
  warningBannerText: { fontSize: 12, color: "#ef4444", lineHeight: 17, opacity: 0.85 },
  ticketBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  ticketBannerType: { fontSize: 11, fontWeight: "700", marginBottom: 1 },
  ticketBannerSubject: { fontSize: 13, fontWeight: "600" },
  ticketStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ticketStatusText: { fontSize: 12, fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12, fontWeight: "600", paddingHorizontal: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMe: { flexDirection: "row-reverse" },
  bubbleWrapper: { maxWidth: "75%", alignItems: "flex-start" },
  bubbleWrapperMe: { alignItems: "flex-end" },
  senderLabel: { fontSize: 11, fontWeight: "600", marginBottom: 3, marginLeft: 2 },
  senderLabelMe: { textAlign: "right", marginRight: 2, marginLeft: 0 },
  bubble: { padding: 12, paddingBottom: 8 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 11, marginTop: 4, textAlign: "right" },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, paddingRight: 2 },
  seenText: { fontSize: 10, fontWeight: "600" },
  empty: { paddingVertical: 60, alignItems: "center" },
  oneWayBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
  oneWayText: { fontSize: 13, textAlign: "center", lineHeight: 18, flex: 1 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, padding: 12, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  startConvBar: { paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: 1 },
  startConvInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  startConvText: { fontSize: 13, flex: 1 },
  startConvBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  startConvBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
