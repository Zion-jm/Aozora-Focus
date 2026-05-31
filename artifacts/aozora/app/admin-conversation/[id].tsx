import React, { useState, useRef, useEffect } from "react";
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
  Alert,
} from "react-native";
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

export default function AdminConversationScreen() {
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
      }

      if (convRes.ok) {
        const data = await convRes.json();
        const conv = (data.conversations || []).find((c: any) => c.type === "admin" && c.id === convId);
        if (conv) {
          setOtherUser(conv.otherParticipant);
          setConversationType(conv.conversationType || "warning");
          setTicketInfo(conv.ticket || null);
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
    fetchMessages();
  }, [convId, token]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [convId, token]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Conversation",
      "This will remove the conversation from your view.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiFetch(`/api/admin-conversations/${convId}`, token!, { method: "DELETE" });
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete conversation. Please try again.");
            }
          },
        },
      ]
    );
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
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  const lastReadSentIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user?.id && messages[i].isRead) return i;
    }
    return -1;
  })();

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === user?.id;
    const reversedIndex = messages.length - 1 - index;
    const isLastReadSent = isMe && reversedIndex === lastReadSentIndex;

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <UserAvatar
            name={item.sender?.fullName ?? otherUser?.fullName}
            avatarUrl={item.sender?.avatarUrl ?? otherUser?.avatarUrl}
            size={32}
            color={conversationType === "support" ? colors.primary : "#ef4444"}
            backgroundColor={conversationType === "support" ? colors.primary + "22" : "#ef444422"}
            userId={item.sender?.id ?? otherUser?.id}
          />
        )}
        <View style={styles.bubbleWrapper}>
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
              {item.content}
            </Text>
            <Text style={[styles.timeText, { color: isMe ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

  const isAdmin = user?.role === "admin";
  const isOneWay = conversationType === "warning" && !isAdmin;

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
        <View style={[styles.warningBanner, { backgroundColor: "#ef444410", borderColor: "#ef444430" }]}>
          <Ionicons name="warning-outline" size={16} color="#ef4444" />
          <Text style={styles.warningBannerText}>
            This is an official message from the Aozora admin team.
          </Text>
        </View>
      )}

      {/* Support ticket info banner for admin */}
      {isAdmin && ticketInfo && (
        <View style={[styles.ticketBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="life-buoy" size={15} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ticketBannerType, { color: colors.primary }]}>{ticketInfo.ticketType}</Text>
            <Text style={[styles.ticketBannerSubject, { color: colors.foreground }]}>{ticketInfo.subject}</Text>
          </View>
          <View style={[styles.ticketStatusChip, { backgroundColor: ticketInfo.status === "resolved" ? "#10b981" + "18" : "#f97316" + "18" }]}>
            <Text style={[styles.ticketStatusText, { color: ticketInfo.status === "resolved" ? "#10b981" : "#f97316" }]}>
              {ticketInfo.status === "resolved" ? "Resolved" : "Pending"}
            </Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={[...messages].reverse()}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderMessage}
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
      {isOneWay ? (
        /* One-way notice — user cannot reply to warnings */
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "bold" },
  headerSub: { fontSize: 12, marginTop: 1 },
  warningBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  warningBadgeText: { color: "#ef4444", fontSize: 11, fontWeight: "600" },
  supportBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  supportBadgeText: { fontSize: 11, fontWeight: "600" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  warningBannerText: { flex: 1, fontSize: 13, color: "#ef4444", lineHeight: 18 },
  ticketBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  ticketBannerType: { fontSize: 11, fontWeight: "700", marginBottom: 1 },
  ticketBannerSubject: { fontSize: 13, fontWeight: "600" },
  ticketStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  ticketStatusText: { fontSize: 12, fontWeight: "700" },
  listContent: { padding: 16, gap: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMe: { flexDirection: "row-reverse" },
  bubbleWrapper: { maxWidth: "75%", alignItems: "flex-end" },
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
});
