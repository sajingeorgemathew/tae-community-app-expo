import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { FeedStackParamList } from "../navigation/FeedStack";
import { fetchFeedPosts, toggleReaction, type FeedPost, type Emoji } from "../lib/posts";
import PostCard from "../components/PostCard";

type Nav = NativeStackNavigationProp<FeedStackParamList, "FeedList">;

type AudienceFilter = "all" | "students" | "alumni";

const FILTER_OPTIONS: { value: AudienceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "students", label: "Students" },
  { value: "alumni", label: "Alumni" },
];

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [filter, setFilter] = useState<AudienceFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchFeedPosts();
      setPosts(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReaction = useCallback(async (postId: string, emoji: Emoji) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const hasReacted = post.userReactions.includes(emoji);

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newCounts = { ...p.reactionCounts };
        const newUserReactions = hasReacted
          ? p.userReactions.filter((e) => e !== emoji)
          : [...p.userReactions, emoji];
        newCounts[emoji] = (newCounts[emoji] ?? 0) + (hasReacted ? -1 : 1);
        if (newCounts[emoji] <= 0) delete newCounts[emoji];
        return { ...p, reactionCounts: newCounts, userReactions: newUserReactions };
      }),
    );

    try {
      await toggleReaction(postId, emoji, hasReacted);
    } catch {
      // Revert on error by reloading
      load();
    }
  }, [posts, load]);

  // Refresh feed every time the screen comes into focus (e.g. after creating a post)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Client-side filtering matching web behavior:
  // "all" → show everything
  // "students" → posts with audience "students" OR "all"
  // "alumni" → posts with audience "alumni" OR "all"
  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter((p) => p.audience === filter || p.audience === "all");

  // ---------- Loading ----------
  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4a6fa5" />
        <Text style={styles.loadingText}>Loading feed…</Text>
      </View>
    );
  }

  // ---------- Error ----------
  if (error && posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>!</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Empty ----------
  if (filteredPosts.length === 0 && posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to share something with the community.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => navigation.navigate("NewPost")}
        >
          <Text style={styles.primaryButtonText}>Create Post</Text>
        </Pressable>
        <Pressable style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  // ---------- Feed list ----------
  return (
    <View style={styles.root}>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#4a6fa5"
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.filterChip,
                    filter === opt.value && styles.filterChipActive,
                  ]}
                  onPress={() => setFilter(opt.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === opt.value && styles.filterChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.newPostBar}>
              <Pressable
                style={styles.primaryButton}
                onPress={() => navigation.navigate("NewPost")}
              >
                <Text style={styles.primaryButtonText}>New Post</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyFiltered}>
            <Text style={styles.emptyFilteredText}>
              No posts for this filter.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
            onImagePress={(uri) => navigation.navigate("ImageViewer", { uri })}
            onReactionPress={(emoji) => handleReaction(item.id, emoji)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f6f8" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#f5f6f8",
  },
  list: { padding: 16, paddingTop: 0 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#4a6fa5",
    borderColor: "#4a6fa5",
  },
  filterChipText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  newPostBar: { paddingVertical: 12, alignItems: "flex-end" },
  emptyFiltered: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyFilteredText: {
    fontSize: 14,
    color: "#888",
  },

  // Loading
  loadingText: { fontSize: 14, color: "#999", marginTop: 12 },

  // Error
  errorIcon: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    backgroundColor: "#d44",
    width: 48,
    height: 48,
    lineHeight: 48,
    borderRadius: 24,
    textAlign: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  errorText: { fontSize: 15, color: "#c00", textAlign: "center", marginBottom: 16 },

  // Empty
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 6 },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
  },

  // Buttons
  primaryButton: {
    backgroundColor: "#4a6fa5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  retryButtonText: { color: "#555", fontSize: 14 },
});
