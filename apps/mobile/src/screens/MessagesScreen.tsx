import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
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
      ? item.last_message_content.slice(0, 80) + "\u2026"
      : item.last_message_content
    : "No messages yet";
  const hasUnreadBadge = item.is_unread && item.unread_count > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
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
          <View style={styles.rowTopRight}>
            {item.last_message_at ? (
              <Text
                style={[
                  styles.time,
                  item.is_unread && styles.timeUnread,
                ]}
              >
                {formatTime(item.last_message_at)}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.preview, item.is_unread && styles.previewBold]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnreadBadge ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>No messages</Text>
        <Text style={styles.emptyText}>
          Your conversations will appear here
        </Text>
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#007AFF"
        />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
    marginTop: 12,
  },
  errorIcon: {
    fontSize: 28,
    fontWeight: "700",
    color: "#c00",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#c00",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 12,
  },
  errorText: { fontSize: 15, color: "#c00", textAlign: "center" },
  emptyIcon: {
    fontSize: 17,
    fontWeight: "600",
    color: "#888",
    marginBottom: 4,
  },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center" },
  spacer: { height: 16 },
  retryButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  listContent: {
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  rowPressed: {
    backgroundColor: "#f5f5f5",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "600", color: "#fff" },
  rowContent: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rowTopRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  name: { fontSize: 16, color: "#111", flex: 1, marginRight: 8 },
  nameBold: { fontWeight: "700" },
  time: { fontSize: 12, color: "#888" },
  timeUnread: { color: "#007AFF", fontWeight: "500" },
  rowBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  preview: { fontSize: 14, color: "#666", flex: 1, marginRight: 8 },
  previewBold: { fontWeight: "600", color: "#333" },
  unreadBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#e0e0e0", marginLeft: 80 },
});
