import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import { fetchPostById, type PostDetail } from "../lib/posts";

type Props = NativeStackScreenProps<FeedStackParamList, "PostDetail">;

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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Post not found"}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  const authorName = post.profiles?.full_name ?? "Unknown";
  const imageAttachments = post.attachments.filter((a) => a.type === "image");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.authorName}>{authorName}</Text>
      <Text style={styles.date}>{formatDate(post.created_at)}</Text>

      <Text style={styles.content}>{post.content}</Text>

      {imageAttachments.map((a) => {
        const url = post.imageUrls.get(a.storage_path);
        if (!url) return null;
        return (
          <Image
            key={a.id}
            source={{ uri: url }}
            style={styles.image}
            resizeMode="contain"
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  spacer: { height: 16 },
  scroll: { flex: 1 },
  container: { padding: 20 },
  authorName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  date: { fontSize: 13, color: "#888", marginBottom: 16 },
  content: { fontSize: 15, color: "#222", lineHeight: 22, marginBottom: 16 },
  image: { width: "100%", height: 250, borderRadius: 8, marginBottom: 12 },
});
