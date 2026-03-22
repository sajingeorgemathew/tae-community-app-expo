import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import type { MeStackParamList } from "../navigation/MeStack";
import {
  fetchPostById,
  toggleReaction,
  deletePost,
  fetchComments,
  addComment,
  deleteComment,
  EMOJI_SET,
  type PostDetail,
  type Emoji,
  type CommentWithAuthor,
} from "../lib/posts";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";

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

function formatCommentDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function authorInitial(name: string | null): string {
  return (name ?? "?")[0]?.toUpperCase() ?? "?";
}

function DetailImage({ uri, onPress }: { uri: string; onPress?: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Pressable onPress={onPress}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

export default function PostDetailScreen({ route }: Props) {
  const { postId } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<FeedStackParamList>>();
  const { session } = useAuth();
  const { profile } = useMyProfile();
  const currentUserId = session?.user?.id ?? null;
  const isAdmin = profile?.role === "admin";
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch (e: unknown) {
      setCommentsError(e instanceof Error ? e.message : "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  // Reload post when screen gains focus (e.g. returning from EditPost)
  useFocusEffect(
    useCallback(() => {
      load();
      loadComments();
    }, [load, loadComments]),
  );

  const handleDeleteComment = (commentId: string) => {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteComment(commentId);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete comment");
          }
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const created = await addComment(postId, trimmed);
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (e: unknown) {
      setCommentsError(e instanceof Error ? e.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

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
  const isOwner = currentUserId != null && post.author_id === currentUserId;
  const canEdit = isOwner;
  const canDelete = isOwner || isAdmin;

  const handleEdit = () => {
    navigation.navigate("EditPost", { postId: post.id, content: post.content });
  };

  const handleDeletePost = () => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post.id);
            navigation.goBack();
          } catch (e: unknown) {
            Alert.alert("Error", e instanceof Error ? e.message : "Failed to delete post");
          }
        },
      },
    ]);
  };

  const handleReaction = async (emoji: Emoji) => {
    if (!post) return;
    const hasReacted = post.userReactions.includes(emoji);

    // Optimistic update
    setPost((prev) => {
      if (!prev) return prev;
      const newCounts = { ...prev.reactionCounts };
      const newUserReactions = hasReacted
        ? prev.userReactions.filter((e) => e !== emoji)
        : [...prev.userReactions, emoji];
      newCounts[emoji] = (newCounts[emoji] ?? 0) + (hasReacted ? -1 : 1);
      if (newCounts[emoji] <= 0) delete newCounts[emoji];
      return { ...prev, reactionCounts: newCounts, userReactions: newUserReactions };
    });

    try {
      await toggleReaction(postId, emoji, hasReacted);
    } catch {
      load();
    }
  };

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

      {/* Owner / admin actions */}
      {(canEdit || canDelete) && (
        <View style={styles.actionsRow}>
          {canEdit && (
            <Pressable style={styles.actionButton} onPress={handleEdit}>
              <Text style={styles.actionButtonText}>Edit</Text>
            </Pressable>
          )}
          {canDelete && (
            <Pressable style={styles.actionButtonDestructive} onPress={handleDeletePost}>
              <Text style={styles.actionButtonDestructiveText}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Images */}
      {imageAttachments.map((a) => {
        const url = post.imageUrls.get(a.storage_path);
        if (!url) return null;
        return (
          <DetailImage
            key={a.id}
            uri={url}
            onPress={() => navigation.navigate("ImageViewer", { uri: url })}
          />
        );
      })}

      {/* Reactions */}
      <View style={styles.reactionBar}>
        {EMOJI_SET.map((emoji) => {
          const count = post.reactionCounts[emoji] ?? 0;
          const active = post.userReactions.includes(emoji);
          return (
            <Pressable
              key={emoji}
              style={[styles.reactionButton, active && styles.reactionButtonActive]}
              onPress={() => handleReaction(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {count > 0 && (
                <Text style={[styles.reactionCount, active && styles.reactionCountActive]}>
                  {count}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Comments section */}
      <View style={styles.commentsSection}>
        <Text style={styles.commentsHeader}>
          Comments{comments.length > 0 ? ` (${comments.length})` : ""}
        </Text>

        {commentsLoading && comments.length === 0 && (
          <ActivityIndicator size="small" color="#4a6fa5" style={styles.commentsLoader} />
        )}

        {commentsError && (
          <View style={styles.commentsErrorRow}>
            <Text style={styles.commentsErrorText}>{commentsError}</Text>
            <Pressable onPress={loadComments}>
              <Text style={styles.commentsRetryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!commentsLoading && !commentsError && comments.length === 0 && (
          <Text style={styles.noComments}>No comments yet. Be the first!</Text>
        )}

        {comments.map((c) => {
          const canDeleteComment =
            currentUserId != null && (c.author_id === currentUserId || isAdmin);
          return (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{authorInitial(c.author_name)}</Text>
                </View>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentAuthor}>{c.author_name}</Text>
                  <Text style={styles.commentDate}>{formatCommentDate(c.created_at)}</Text>
                </View>
                {canDeleteComment && (
                  <Pressable
                    style={styles.commentDeleteButton}
                    onPress={() => handleDeleteComment(c.id)}
                    hitSlop={8}
                  >
                    <Text style={styles.commentDeleteText}>Delete</Text>
                  </Pressable>
                )}
              </View>
              <Text style={styles.commentContent}>{c.content}</Text>
            </View>
          );
        })}

        {/* Add comment input */}
        <View style={styles.addCommentRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment…"
            placeholderTextColor="#999"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            editable={!submitting}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!newComment.trim() || submitting) && styles.sendButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
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
  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4a6fa5",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a6fa5",
  },
  actionButtonDestructive: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c00",
  },
  actionButtonDestructiveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#c00",
  },
  // Content
  content: { fontSize: 15, color: "#222", lineHeight: 22, marginBottom: 16 },
  // Images
  image: { width: "100%", aspectRatio: 16 / 9, borderRadius: 8, marginBottom: 12 },
  // Reactions
  reactionBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fafafa",
  },
  reactionButtonActive: {
    borderColor: "#4a6fa5",
    backgroundColor: "#e8eef6",
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  reactionCountActive: {
    color: "#4a6fa5",
  },
  // Comments
  commentsSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e8e8e8",
    paddingTop: 16,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  commentsLoader: {
    marginVertical: 16,
  },
  commentsErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  commentsErrorText: {
    fontSize: 13,
    color: "#c00",
    flex: 1,
  },
  commentsRetryText: {
    fontSize: 13,
    color: "#4a6fa5",
    fontWeight: "600",
  },
  noComments: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e0e7ef",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4a6fa5",
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  commentDate: {
    fontSize: 11,
    color: "#999",
  },
  commentContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  commentDeleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  commentDeleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#c00",
  },
  // Add comment
  addCommentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#222",
    backgroundColor: "#fff",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4a6fa5",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
