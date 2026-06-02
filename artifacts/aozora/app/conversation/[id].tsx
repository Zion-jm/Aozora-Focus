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
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/UserAvatar";
import { ReportModal } from "@/components/ReportModal";
import {
  getListMessagesQueryKey,
  useListMessages,
  useSendMessage,
  useMarkConversationRead,
  getGetConversationsQueryKey,
} from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = id ? parseInt(id, 10) : 0;
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { showConfirm } = useConfirm();
  const [text, setText] = useState("");
  const [showReport, setShowReport] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const { data, isLoading, refetch } = useListMessages(convId, {
    query: { enabled: !!convId, queryKey: getListMessagesQueryKey(convId) },
  });

  const messages: any[] = (data as any)?.messages || [];

  const markRead = useMarkConversationRead();

  const send = useSendMessage({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
        qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
        setText("");
      },
    },
  });

  useEffect(() => {
    if (convId) markRead.mutate({ conversationId: convId });
  }, [convId]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch().then(() => {
        if (convId) markRead.mutate({ conversationId: convId });
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [refetch, convId]);

  const handleSend = () => {
    if (!text.trim()) return;
    send.mutate({ conversationId: convId, data: { content: text.trim() } });
  };

  const handleDelete = () => {
    showConfirm({
      title: "Delete Conversation",
      message: "This will remove the conversation from your view. The other party won't be affected until they delete it too.",
      confirmLabel: "Delete",
      destructive: true,
      icon: "trash-2",
      onConfirm: async () => {
        try {
          await fetch(`${BASE_URL}/api/conversations/${convId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
          router.back();
        } catch {
          toast.error("Error", "Could not delete conversation. Please try again.");
        }
      },
    });
  };

  const otherUser = useMemo(() => {
    const m = messages.find((msg: any) => msg.senderId !== user?.id);
    return m?.sender ?? null;
  }, [messages, user?.id]);

  // ID of the last message I sent that has been seen — used for the "Seen" receipt
  const lastReadSentId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === user?.id && messages[i].isRead) return messages[i].id;
    }
    return -1;
  }, [messages, user?.id]);

  // Build list with date dividers in chronological order (oldest first)
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
    return items;
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
    const senderName = isMe ? "You" : (msg.sender?.fullName ?? "Unknown");

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <UserAvatar
            name={msg.sender?.fullName}
            avatarUrl={msg.sender?.avatarUrl}
            size={32}
            color={colors.primary}
            backgroundColor={colors.primary + "22"}
            userId={msg.sender?.id}
          />
        )}
        <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
          <Text style={[styles.senderName, isMe && styles.senderNameMe, { color: colors.mutedForeground }]}>
            {senderName}
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
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>{msg.content}</Text>
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top || 48,
            backgroundColor: colors.card,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        {otherUser ? (
          <UserAvatar
            name={otherUser.fullName}
            avatarUrl={otherUser.avatarUrl}
            size={34}
            color={colors.primary}
            backgroundColor={colors.primary + "22"}
            userId={otherUser.id}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {otherUser?.fullName || "Conversation"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {otherUser && (
            <TouchableOpacity
              onPress={() => setShowReport(true)}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="flag" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={20} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      {otherUser && (
        <ReportModal
          visible={showReport}
          onClose={() => setShowReport(false)}
          targetType="user"
          targetId={otherUser.id}
          targetLabel={otherUser.fullName}
          token={token}
          colors={colors}
        />
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
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
          contentContainerStyle={[styles.listContent, { paddingBottom: 16 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontSize: 15, marginTop: 12 }]}>
                Start the conversation!
              </Text>
            </View>
          }
        />
      )}

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || 16,
          },
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
          placeholder="Type a message..."
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
          disabled={!text.trim() || send.isPending}
        >
          {send.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  headerSub: { fontSize: 12 },
  listContent: { padding: 16, gap: 12 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12, fontWeight: "600", paddingHorizontal: 8 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMe: { flexDirection: "row-reverse" },
  bubbleWrapper: { maxWidth: "75%", alignItems: "flex-start" },
  bubbleWrapperMe: { alignItems: "flex-end" },
  senderName: { fontSize: 11, fontWeight: "600", marginBottom: 3, marginLeft: 2 },
  senderNameMe: { textAlign: "right", marginRight: 2, marginLeft: 0 },
  bubble: { padding: 12, paddingBottom: 8 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 11, marginTop: 4, textAlign: "right" },
  seenRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, paddingRight: 2 },
  seenText: { fontSize: 10, fontWeight: "600" },
  empty: { paddingVertical: 60, alignItems: "center" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, padding: 12, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
