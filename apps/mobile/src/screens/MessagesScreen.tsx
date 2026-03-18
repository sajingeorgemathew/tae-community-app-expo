import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { ConversationListItem } from "@tae/shared";
import type { MessagesStackParamList } from "../navigation/MessagesStack";
import { fetchMyConversations, resolveAvatarUrl } from "../lib/messages";

type Nav = NativeStackNavigationProp<MessagesStackParamList, "MessagesList">;

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ConversationRow({
  item,
  avatarUrl,
  onPress,
}: {
  item: ConversationListItem;
  avatarUrl: string | null;
  onPress: () => void;
}) {
  const name = item.other_user_name || "Unknown";
  const preview = item.last_message_content
    ? item.last_message_content.length > 80
      ? item.last_message_content.slice(0, 80) + "…"
      : item.last_message_content
    : "No messages yet";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.name, item.is_unread && styles.nameBold]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {item.last_message_at ? (
            <Text style={styles.time}>{formatTime(item.last_message_at)}</Text>
          ) : null}
        </View>
        <Text
          style={[styles.preview, item.is_unread && styles.previewBold]}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyConversations();
      setConversations(data);

      // Resolve avatar URLs in background
      const avatarPaths = data
        .filter((c) => c.other_user_avatar_path)
        .map((c) => c.other_user_avatar_path!);

      if (avatarPaths.length > 0) {
        const urls = new Map<string, string>();
        await Promise.all(
          data
            .filter((c) => c.other_user_avatar_path)
            .map(async (c) => {
              const url = await resolveAvatarUrl(c.other_user_avatar_path!);
              if (url) urls.set(c.conversation_id, url);
            }),
        );
        setAvatarUrls(urls);
      }
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to load conversations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No conversations yet</Text>
        <View style={styles.spacer} />
        <Button title="Refresh" onPress={load} />
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.conversation_id}
      renderItem={({ item }) => (
        <ConversationRow
          item={item}
          avatarUrl={avatarUrls.get(item.conversation_id) ?? null}
          onPress={() =>
            navigation.navigate("Conversation", {
              conversationId: item.conversation_id,
              otherUserName: item.other_user_name || undefined,
            })
          }
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  spacer: { height: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 18, fontWeight: "600", color: "#666" },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: { fontSize: 15, color: "#111", flex: 1, marginRight: 8 },
  nameBold: { fontWeight: "700" },
  time: { fontSize: 12, color: "#888" },
  preview: { fontSize: 13, color: "#666" },
  previewBold: { fontWeight: "600", color: "#333" },
  separator: { height: 1, backgroundColor: "#eee", marginLeft: 76 },
});
