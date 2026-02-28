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
import type { FeedStackParamList } from "../navigation/FeedStack";
import { fetchFeedPosts, type FeedPost } from "../lib/posts";

type Nav = NativeStackNavigationProp<FeedStackParamList, "FeedList">;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PostCard({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  const authorName = post.profiles?.full_name ?? "Unknown";
  const preview =
    post.content.length > 140
      ? post.content.slice(0, 140) + "…"
      : post.content;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.authorName}>{authorName}</Text>
        <Text style={styles.date}>{formatDate(post.created_at)}</Text>
      </View>
      <Text style={styles.content}>{preview}</Text>
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeedPosts();
      setPosts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
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

  if (posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No posts yet</Text>
        <View style={styles.spacer} />
        <Button title="Refresh" onPress={load} />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  spacer: { height: 16 },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  authorName: { fontSize: 15, fontWeight: "600" },
  date: { fontSize: 12, color: "#888" },
  content: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 8 },
  thumbnail: { width: "100%", height: 180, borderRadius: 6 },
});
