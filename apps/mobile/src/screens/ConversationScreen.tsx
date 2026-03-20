import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MessageWithAttachments } from "@tae/shared";
import type { MessagesStackParamList } from "../navigation/MessagesStack";
import {
  deleteMessage,
  fetchConversationMessages,
  resolveMessageSignedUrls,
  sendMessage,
  uploadAndLinkAttachment,
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
  const [attachment, setAttachment] = useState<ImagePicker.ImagePickerAsset | null>(null);
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
        const fileName = attachment.fileName ?? `attachment.${attachment.type === "video" ? "mp4" : "jpg"}`;
        try {
          await uploadAndLinkAttachment({
            conversationId,
            messageId,
            fileUri: attachment.uri,
            mimeType: attachment.mimeType ?? (attachment.type === "video" ? "video/mp4" : "image/jpeg"),
            fileName,
            fileSize: attachment.fileSize ?? undefined,
          });
        } catch (attachErr: unknown) {
          // Attachment failed — rollback the message row if it has no text content
          // (i.e. it would be a ghost/blank row without the attachment)
          if (!trimmed) {
            try {
              await deleteMessage(messageId);
            } catch {
              // Best-effort rollback; the original error is more important
            }
          }
          throw attachErr;
        }
      }

      setText("");
      setAttachment(null);
      await load();
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send message";
      setSendError(attachment ? `Attachment failed: ${msg}` : msg);
      Alert.alert(
        "Send failed",
        attachment
          ? `Could not upload attachment. ${msg}`
          : msg,
      );
    } finally {
      setSending(false);
    }
  }, [text, attachment, sending, myUserId, conversationId, load]);

  const canSend = (text.trim().length > 0 || attachment !== null) && !sending;

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
          <TouchableOpacity onPress={removeAttachment} style={styles.previewRemove}>
            <Text style={styles.previewRemoveText}>✕</Text>
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
