import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessageWithAttachments } from "@tae/shared";
import type { MessagesStackParamList } from "../navigation/MessagesStack";
import {
  deleteMessage,
  fetchConversationMessages,
  markConversationAsRead,
  resolveMessageSignedUrls,
  sendMessage,
  uploadAndLinkAttachment,
} from "../lib/messages";
import { notifyMessagingStateChange } from "../lib/messagingEvents";
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
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();
  const dateStr = d.toDateString();

  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Check if two consecutive messages should be visually grouped (same sender, within 2 min). */
function isSameGroup(
  current: MessageWithAttachments,
  prev: MessageWithAttachments | null,
): boolean {
  if (!prev) return false;
  if (current.sender_id !== prev.sender_id) return false;
  const diffMs =
    new Date(current.created_at).getTime() -
    new Date(prev.created_at).getTime();
  return diffMs < 2 * 60 * 1000;
}

function MessageBubble({
  message,
  isMine,
  imageUrls,
  isGrouped,
  isLast,
}: {
  message: MessageWithAttachments;
  isMine: boolean;
  imageUrls: Map<string, string>;
  isGrouped: boolean;
  isLast: boolean;
}) {
  const imageAttachments = message.message_attachments?.filter(
    (a) => a.type === "image",
  );
  const showTime = isLast || !isGrouped;

  return (
    <View
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
        isGrouped ? styles.bubbleRowGrouped : styles.bubbleRowSpaced,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          isLast && isMine && styles.bubbleMineTail,
          isLast && !isMine && styles.bubbleTheirsTail,
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
        {showTime ? (
          <Text
            style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}
          >
            {formatTime(message.created_at)}
          </Text>
        ) : null}
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
  const [attachment, setAttachment] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
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

      // Mark conversation as read now that messages are loaded
      if (myUserId) {
        markConversationAsRead(conversationId, myUserId)
          .then(() => notifyMessagingStateChange())
          .catch(() => {
            // Non-critical — read state will sync on next focus
          });
      }

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
  }, [conversationId, myUserId]);

  useEffect(() => {
    load();
  }, [load]);

  // Reversed copy for the inverted FlatList (newest-first in data order).
  const reversedMessages = React.useMemo(
    () => [...messages].reverse(),
    [messages],
  );

  const pickAttachment = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAttachment(result.assets[0]);
    }
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment(null);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    // Block empty sends: must have text or attachment
    if ((!trimmed && !attachment) || sending || !myUserId) return;

    setSending(true);
    setSendError(null);
    try {
      // 1) Create message row
      const { id: messageId } = await sendMessage({
        conversation_id: conversationId,
        sender_id: myUserId,
        content: trimmed || "",
      });

      // 2) Upload attachment & insert linkage if present
      if (attachment) {
        const fileName =
          attachment.fileName ??
          `attachment.${attachment.type === "video" ? "mp4" : "jpg"}`;
        try {
          await uploadAndLinkAttachment({
            conversationId,
            messageId,
            fileUri: attachment.uri,
            mimeType:
              attachment.mimeType ??
              (attachment.type === "video" ? "video/mp4" : "image/jpeg"),
            fileName,
            fileSize: attachment.fileSize ?? undefined,
          });
        } catch (attachErr: unknown) {
          // Attachment failed — rollback the message row if it has no text content
          if (!trimmed) {
            try {
              await deleteMessage(messageId);
            } catch {
              // Best-effort rollback
            }
          }
          throw attachErr;
        }
      }

      setText("");
      setAttachment(null);
      await load();
      notifyMessagingStateChange();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send message";
      setSendError(attachment ? `Attachment failed: ${msg}` : msg);
      Alert.alert(
        "Send failed",
        attachment ? `Could not upload attachment. ${msg}` : msg,
      );
    } finally {
      setSending(false);
    }
  }, [text, attachment, sending, myUserId, conversationId, load]);

  const canSend = (text.trim().length > 0 || attachment !== null) && !sending;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Send a message to start the conversation
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={reversedMessages}
          inverted
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          style={styles.listBg}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === myUserId;
            // In the inverted list the visual message "above" is at index+1
            // and the visual message "below" is at index-1.
            const aboveMessage =
              index < reversedMessages.length - 1
                ? reversedMessages[index + 1]
                : null;
            const belowMessage =
              index > 0 ? reversedMessages[index - 1] : null;
            const showDate =
              !aboveMessage ||
              new Date(item.created_at).toDateString() !==
                new Date(aboveMessage.created_at).toDateString();
            const isGrouped =
              !showDate && isSameGroup(item, aboveMessage);
            const isLast =
              !belowMessage || !isSameGroup(belowMessage, item);

            return (
              <>
                {showDate ? (
                  <View style={styles.dateHeaderContainer}>
                    <View style={styles.dateHeaderPill}>
                      <Text style={styles.dateHeaderText}>
                        {formatDateHeader(item.created_at)}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <MessageBubble
                  message={item}
                  isMine={isMine}
                  imageUrls={imageUrls}
                  isGrouped={isGrouped}
                  isLast={isLast}
                />
              </>
            );
          }}
        />
      )}

      {sendError ? (
        <Text style={styles.sendErrorText}>{sendError}</Text>
      ) : null}

      {attachment ? (
        <View style={styles.attachmentPreview}>
          <Image
            source={{ uri: attachment.uri }}
            style={styles.previewThumb}
            resizeMode="cover"
          />
          <Text style={styles.previewName} numberOfLines={1}>
            {attachment.fileName ?? "Attachment"}
          </Text>
          <TouchableOpacity
            onPress={removeAttachment}
            style={styles.previewRemove}
          >
            <Text style={styles.previewRemoveText}>{"\u2715"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.composer}>
        <TouchableOpacity
          onPress={pickAttachment}
          disabled={sending}
          style={styles.attachButton}
          activeOpacity={0.7}
        >
          <Text style={styles.attachButtonText}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.composerInput}
          placeholder="Type a message\u2026"
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
  flex: { flex: 1, backgroundColor: "#f6f6f6" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f6f6f6",
  },
  errorText: { fontSize: 15, color: "#c00", textAlign: "center" },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
  },
  emptySubtitle: { fontSize: 14, color: "#999", textAlign: "center" },
  spacer: { height: 16 },
  retryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  listBg: { backgroundColor: "#f6f6f6" },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16 },
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateHeaderPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowLeft: { justifyContent: "flex-start" },
  bubbleRowRight: { justifyContent: "flex-end" },
  bubbleRowGrouped: { marginTop: 2 },
  bubbleRowSpaced: { marginTop: 8 },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 18,
  },
  bubbleMineTail: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#E9E9EB",
    borderBottomLeftRadius: 18,
  },
  bubbleTheirsTail: {
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 16, lineHeight: 21 },
  messageTextMine: { color: "#fff" },
  messageTextTheirs: { color: "#111" },
  time: { fontSize: 11, marginTop: 3 },
  timeMine: { color: "rgba(255,255,255,0.65)", textAlign: "right" },
  timeTheirs: { color: "#888", textAlign: "left" },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginTop: 6,
  },
  sendErrorText: {
    color: "#c00",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f0f0f0",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  previewThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  previewName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#333",
  },
  previewRemove: {
    padding: 6,
  },
  previewRemoveText: {
    fontSize: 16,
    color: "#888",
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e9e9eb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  attachButtonText: {
    fontSize: 22,
    color: "#007AFF",
    lineHeight: 24,
    fontWeight: "600",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
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
