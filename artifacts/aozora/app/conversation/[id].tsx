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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

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

export default function ConversationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const convId = id ? parseInt(id, 10) : 0;
  const { user, token } = useAuth();
  const qc = useQueryClient();
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
    if (convId) {
      markRead.mutate({ conversationId: convId });
    }
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
    Alert.alert(
      "Delete Conversation",
      "This will remove the conversation from your view. The other party won't be affected until they delete it too.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BASE_URL}/api/conversations/${convId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              qc.invalidateQueries({ queryKey: getGetConversationsQueryKey() });
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete conversation. Please try again.");
            }
          },
        },
      ]
    );
  };

  const otherUser = useMemo(() => {
    const m = messages.find((msg: any) => msg.senderId !== user?.id);
    return m?.sender ?? null;
  }, [messages, user?.id]);

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
            name={item.sender?.fullName}
            avatarUrl={item.sender?.avatarUrl}
            size={32}
            color={colors.primary}
            backgroundColor={colors.primary + "22"}
            userId={item.sender?.id}
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
            <Text style={[styles.bubbleText, { color: isMe ? "#fff" : colors.foreground }]}>{item.content}</Text>
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
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Conversation
        </Text>
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
          data={[...messages].reverse()}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderMessage}
          inverted
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center" },
  listContent: { padding: 16, gap: 12 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginVertical: 2 },
  msgRowMe: { flexDirection: "row-reverse" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "bold" },
  bubbleWrapper: { maxWidth: "75%", alignItems: "flex-end" },
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
