import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import type { MeStackParamList } from "../navigation/MeStack";
import { fetchPostById, type PostDetail } from "../lib/posts";

type Props =
  | NativeStackScreenProps<FeedStackParamList, "PostDetail">
  | NativeStackScreenProps<MeStackParamList, "PostDetail">;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function authorInitial(name: string | null): string {
  return (name ?? "?")[0]?.toUpperCase() ?? "?";
}

function DetailImage({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      source={{ uri }}
      style={styles.image}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function PostDetailScreen({ route }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPostById(postId);
      setPost(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a6fa5" />
        <Text style={styles.loadingText}>Loading post…</Text>
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Post not found"}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const authorName = post.profiles?.full_name ?? "Unknown";
  const imageAttachments = post.attachments.filter((a) => a.type === "image");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{authorInitial(authorName)}</Text>
        </View>
        <View style={styles.authorMeta}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.date}>{formatDate(post.created_at)}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Images */}
      {imageAttachments.map((a) => {
        const url = post.imageUrls.get(a.storage_path);
        if (!url) return null;
        return <DetailImage key={a.id} uri={url} />;
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f6f8",
  },
  loadingText: { fontSize: 14, color: "#999", marginTop: 12 },
  errorText: { fontSize: 15, color: "#c00", textAlign: "center", marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  retryButtonText: { color: "#555", fontSize: 14 },
  scroll: { flex: 1, backgroundColor: "#f5f6f8" },
  container: { padding: 20 },
  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e0e7ef",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#4a6fa5" },
  authorMeta: { flex: 1 },
  authorName: { fontSize: 16, fontWeight: "bold", color: "#1a1a1a" },
  date: { fontSize: 13, color: "#888", marginTop: 2 },
  // Content
  content: { fontSize: 15, color: "#222", lineHeight: 22, marginBottom: 16 },
  // Images
  image: { width: "100%", height: 250, borderRadius: 8, marginBottom: 12 },
});
