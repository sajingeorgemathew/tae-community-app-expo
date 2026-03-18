import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessageWithAttachments } from "@tae/shared";
import type { MessagesStackParamList } from "../navigation/MessagesStack";
import {
  fetchConversationMessages,
  resolveMessageSignedUrls,
  sendMessage,
} from "../lib/messages";
import { useAuth } from "../state/auth";

type Props = NativeStackScreenProps<MessagesStackParamList, "Conversation">;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function MessageBubble({
  message,
  isMine,
  imageUrls,
}: {
  message: MessageWithAttachments;
  isMine: boolean;
  imageUrls: Map<string, string>;
}) {
  const imageAttachments = message.message_attachments?.filter(
    (a) => a.type === "image",
  );

  return (
    <View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
        {message.content ? (
          <Text
            style={[
              styles.messageText,
              isMine ? styles.messageTextMine : styles.messageTextTheirs,
            ]}
          >
            {message.content}
          </Text>
        ) : null}
        {imageAttachments?.map((a) => {
          const url = imageUrls.get(a.storage_path);
          if (!url) return null;
          return (
            <Image
              key={a.id}
              source={{ uri: url }}
              style={styles.attachmentImage}
              resizeMode="cover"
            />
          );
        })}
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function ConversationScreen({ route, navigation }: Props) {
  const { conversationId, otherUserName } = route.params;
  const { session } = useAuth();
  const myUserId = session?.user?.id;

  const [messages, setMessages] = useState<MessageWithAttachments[]>([]);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<MessageWithAttachments>>(null);

  useEffect(() => {
    if (otherUserName) {
      navigation.setOptions({ title: otherUserName });
    }
  }, [navigation, otherUserName]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConversationMessages(conversationId);
      setMessages(data);

      // Resolve image attachment URLs
      const paths = data.flatMap(
        (m) =>
          m.message_attachments
            ?.filter((a) => a.type === "image")
            .map((a) => a.storage_path) ?? [],
      );
      if (paths.length > 0) {
        const urls = await resolveMessageSignedUrls(paths);
        setImageUrls(urls);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !myUserId) return;

    setSending(true);
    setSendError(null);
    try {
      await sendMessage({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: trimmed,
      });
      setText("");
      await load();
      // Scroll to bottom after refresh
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [text, sending, myUserId, conversationId, load]);

  const canSend = text.trim().length > 0 && !sending;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No messages yet</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === myUserId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showDate =
              !prevMessage ||
              new Date(item.created_at).toDateString() !==
                new Date(prevMessage.created_at).toDateString();

            return (
              <>
                {showDate ? (
                  <Text style={styles.dateHeader}>
                    {formatDateHeader(item.created_at)}
                  </Text>
                ) : null}
                <MessageBubble
                  message={item}
                  isMine={isMine}
                  imageUrls={imageUrls}
                />
              </>
            );
          }}
        />
      )}

      {sendError ? (
        <Text style={styles.sendErrorText}>{sendError}</Text>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          placeholder="Type a message…"
          placeholderTextColor="#999"
          value={text}
          onChangeText={setText}
          editable={!sending}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  spacer: { height: 16 },
  list: { padding: 12, paddingBottom: 24 },
  dateHeader: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginVertical: 12,
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#E9E9EB",
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextMine: { color: "#fff" },
  messageTextTheirs: { color: "#111" },
  time: { fontSize: 10, marginTop: 4 },
  timeMine: { color: "rgba(255,255,255,0.7)", textAlign: "right" },
  timeTheirs: { color: "#888", textAlign: "left" },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginTop: 6,
  },
  sendErrorText: {
    color: "#c00",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  composerInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ccc",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#007AFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 56,
    height: 36,
  },
  sendButtonDisabled: {
    backgroundColor: "#b0d4ff",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
