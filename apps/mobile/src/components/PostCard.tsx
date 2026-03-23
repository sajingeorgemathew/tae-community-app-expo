import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { FeedPost, FeedCommentPreview } from "../lib/posts";
import { EMOJI_SET, type Emoji } from "../lib/posts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  // Fall back to short date
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function authorInitial(name: string | null): string {
  return (name ?? "?")[0]?.toUpperCase() ?? "?";
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

interface PostCardProps {
  post: FeedPost;
  onPress: () => void;
  /** Called when the user taps the image preview */
  onImagePress?: (uri: string) => void;
  /** Called when the user taps a reaction emoji */
  onReactionPress?: (emoji: Emoji) => void;
  /** Hide the author row (e.g. on My Posts where it's redundant) */
  hideAuthor?: boolean;
  /** Whether the current user owns this post */
  isOwner?: boolean;
  /** Whether the current user is an admin */
  isAdmin?: boolean;
  /** Called when the user taps Edit */
  onEdit?: () => void;
  /** Called when the user taps Delete */
  onDelete?: () => void;
  /** Current user ID for comment permission checks */
  currentUserId?: string | null;
  /** Called to add a comment */
  onAddComment?: (postId: string, content: string) => Promise<FeedCommentPreview | null>;
  /** Called to edit a comment */
  onEditComment?: (commentId: string, content: string) => Promise<boolean>;
  /** Called to delete a comment */
  onDeleteComment?: (postId: string, commentId: string) => void;
}

const CONTENT_PREVIEW_LIMIT = 200;

// Preview aspect-ratio bounds: clamp between 1:1 (square) and 2.5:1 (wide banner).
// Images within the "normal" range use cover; extreme ratios use contain so the
// full image is visible with letterboxing instead of aggressive cropping.
const MIN_PREVIEW_AR = 1; // tallest allowed (square)
const MAX_PREVIEW_AR = 2.5; // widest allowed
const NORMAL_AR_LOW = 0.8; // below this → contain (very tall)
const NORMAL_AR_HIGH = 2.2; // above this → contain (very wide)

export default function PostCard({ post, onPress, onImagePress, onReactionPress, hideAuthor, isOwner, isAdmin, onEdit, onDelete, currentUserId, onAddComment, onEditComment, onDeleteComment }: PostCardProps) {
  const authorName = post.profiles?.full_name ?? "Unknown";
  const showActions = isOwner || isAdmin;
  const [menuOpen, setMenuOpen] = useState(false);
  const preview =
    post.content.length > CONTENT_PREVIEW_LIMIT
      ? post.content.slice(0, CONTENT_PREVIEW_LIMIT) + "…"
      : post.content;
  const imageCount = post.attachments.filter((a) => a.type === "image").length;
  const [imgError, setImgError] = useState(false);
  const [detectedAR, setDetectedAR] = useState<number | null>(null);

  // Comment interaction state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Local latest comment state (updated after add/edit/delete)
  const [localLatestComment, setLocalLatestComment] = useState<FeedCommentPreview | null>(post.latestComment);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);

  // Sync with parent post data when it changes
  useEffect(() => {
    setLocalLatestComment(post.latestComment);
    setLocalCommentCount(post.commentCount);
  }, [post.latestComment, post.commentCount]);

  // Detect the actual image aspect ratio so we can size the preview container
  useEffect(() => {
    if (!post.imageUrl) return;
    Image.getSize(
      post.imageUrl,
      (w, h) => {
        if (h > 0) setDetectedAR(w / h);
      },
      () => {
        /* ignore – fall back to default 16:9 */
      },
    );
  }, [post.imageUrl]);

  // Compute preview container aspect ratio & resize mode
  const previewAR = detectedAR
    ? Math.min(MAX_PREVIEW_AR, Math.max(MIN_PREVIEW_AR, detectedAR))
    : 16 / 9;
  const useContain =
    detectedAR != null &&
    (detectedAR < NORMAL_AR_LOW || detectedAR > NORMAL_AR_HIGH);

  // Comment handlers
  const handleAddComment = async () => {
    const trimmed = newComment.trim();
    if (!trimmed || submittingComment || !onAddComment) return;

    setSubmittingComment(true);
    try {
      const created = await onAddComment(post.id, trimmed);
      if (created) {
        setLocalLatestComment(created);
        setLocalCommentCount((c) => c + 1);
        setNewComment("");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditLatestComment = () => {
    if (!localLatestComment) return;
    setEditingCommentId(localLatestComment.id);
    setEditContent(localLatestComment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || !editingCommentId || editSaving || !onEditComment) return;

    setEditSaving(true);
    try {
      const success = await onEditComment(editingCommentId, trimmed);
      if (success && localLatestComment && editingCommentId === localLatestComment.id) {
        setLocalLatestComment({
          ...localLatestComment,
          content: trimmed,
          updated_at: new Date().toISOString(),
        });
      }
      setEditingCommentId(null);
      setEditContent("");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteLatestComment = () => {
    if (!localLatestComment || !onDeleteComment) return;
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDeleteComment(post.id, localLatestComment.id);
          // Optimistic: clear the preview
          setLocalLatestComment(null);
          setLocalCommentCount((c) => Math.max(0, c - 1));
        },
      },
    ]);
  };

  // Permission checks for the latest comment
  const isLatestCommentOwner =
    currentUserId != null &&
    localLatestComment != null &&
    localLatestComment.author_id === currentUserId;
  const canEditLatestComment = isLatestCommentOwner;
  const canDeleteLatestComment =
    currentUserId != null &&
    localLatestComment != null &&
    (localLatestComment.author_id === currentUserId || isAdmin === true);
  const isEditingLatest = editingCommentId != null && localLatestComment != null && editingCommentId === localLatestComment.id;

  return (
    <View style={styles.card}>
      {/* Tappable area for navigating to detail - excludes comment interaction */}
      <Pressable
        style={({ pressed }) => [pressed && styles.cardPressed]}
        onPress={onPress}
      >
        {/* Author row */}
        {!hideAuthor && (
          <View style={styles.authorRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{authorInitial(authorName)}</Text>
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.authorName} numberOfLines={1}>
                {authorName}
              </Text>
              <Text style={styles.timestamp}>{relativeTime(post.created_at)}</Text>
            </View>
            {showActions && (
              <Pressable
                style={styles.menuTrigger}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setMenuOpen((v) => !v);
                }}
                hitSlop={8}
              >
                <Text style={styles.menuDots}>···</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Date-only row when author is hidden */}
        {hideAuthor && (
          <View style={styles.hiddenAuthorRow}>
            <Text style={styles.timestampOnly}>{relativeTime(post.created_at)}</Text>
            {showActions && (
              <Pressable
                style={styles.menuTrigger}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setMenuOpen((v) => !v);
                }}
                hitSlop={8}
              >
                <Text style={styles.menuDots}>···</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Action menu */}
        {menuOpen && showActions && (
          <View style={styles.actionMenu}>
            {isOwner && onEdit && (
              <Pressable
                style={styles.actionItem}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                style={styles.actionItem}
                onPress={(e) => {
                  e.stopPropagation?.();
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Text style={[styles.actionText, styles.actionTextDestructive]}>Delete</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Content */}
        {preview.length > 0 && (
          <Text style={styles.content} numberOfLines={6}>
            {preview}
          </Text>
        )}

        {/* Image preview */}
        {post.imageUrl && !imgError ? (
          <Pressable
            style={[
              styles.imageWrapper,
              useContain && styles.imageWrapperContain,
            ]}
            onPress={(e) => {
              e.stopPropagation?.();
              if (onImagePress && post.imageUrl) onImagePress(post.imageUrl);
            }}
          >
            <Image
              source={{ uri: post.imageUrl }}
              style={[styles.thumbnail, { aspectRatio: previewAR }]}
              resizeMode={useContain ? "contain" : "cover"}
              onError={() => setImgError(true)}
            />
            {imageCount > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>+{imageCount - 1}</Text>
              </View>
            )}
          </Pressable>
        ) : null}

        {/* Reaction bar */}
        <View style={styles.reactionBar}>
          {EMOJI_SET.map((emoji) => {
            const count = post.reactionCounts[emoji] ?? 0;
            const active = post.userReactions.includes(emoji);
            return (
              <Pressable
                key={emoji}
                style={[styles.reactionButton, active && styles.reactionButtonActive]}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onReactionPress?.(emoji);
                }}
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
      </Pressable>

      {/* Comment section – outside the navigation pressable */}
      <View style={styles.commentSection}>
        {/* Comment count & view all link */}
        {localCommentCount > 0 && (
          <Pressable onPress={onPress}>
            <Text style={styles.commentCountText}>
              {localCommentCount} {localCommentCount === 1 ? "comment" : "comments"}
              {localCommentCount > 1 ? " — view all" : ""}
            </Text>
          </Pressable>
        )}

        {/* Latest comment preview with actions */}
        {localLatestComment && !isEditingLatest && (
          <View style={styles.latestCommentCard}>
            <View style={styles.latestCommentHeader}>
              <View style={styles.latestCommentAvatar}>
                <Text style={styles.latestCommentAvatarText}>
                  {authorInitial(localLatestComment.author_name)}
                </Text>
              </View>
              <Text style={styles.latestCommentAuthor} numberOfLines={1}>
                {localLatestComment.author_name}
              </Text>
              {localLatestComment.updated_at && localLatestComment.updated_at !== localLatestComment.created_at && (
                <Text style={styles.editedLabel}>(edited)</Text>
              )}
              <View style={styles.latestCommentActions}>
                {canEditLatestComment && onEditComment && (
                  <Pressable onPress={handleEditLatestComment} hitSlop={8}>
                    <Text style={styles.commentActionEdit}>Edit</Text>
                  </Pressable>
                )}
                {canDeleteLatestComment && onDeleteComment && (
                  <Pressable onPress={handleDeleteLatestComment} hitSlop={8}>
                    <Text style={styles.commentActionDelete}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <Text style={styles.latestCommentContent} numberOfLines={2}>
              {localLatestComment.content}
            </Text>
          </View>
        )}

        {/* Inline edit for latest comment */}
        {isEditingLatest && (
          <View style={styles.latestCommentCard}>
            <TextInput
              style={styles.editInput}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
              editable={!editSaving}
            />
            <View style={styles.editActions}>
              <Pressable
                style={styles.editCancelBtn}
                onPress={handleCancelEdit}
                disabled={editSaving}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.editSaveBtn,
                  (!editContent.trim() || editSaving) && styles.btnDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={!editContent.trim() || editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Add comment input */}
        {onAddComment && (
          <View style={styles.addCommentRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment…"
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              editable={!submittingComment}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!newComment.trim() || submittingComment) && styles.btnDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
  },
  // Author row
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0e7ef",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4a6fa5",
  },
  authorMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 1,
  },
  timestampOnly: {
    fontSize: 12,
    color: "#999",
    marginBottom: 0,
  },
  hiddenAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  menuTrigger: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  menuDots: {
    fontSize: 18,
    fontWeight: "900",
    color: "#888",
    letterSpacing: 1,
  },
  actionMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 8,
    overflow: "hidden",
  },
  actionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  actionTextDestructive: {
    color: "#c00",
  },
  // Content
  content: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 10,
  },
  // Image
  imageWrapper: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imageWrapperContain: {
    backgroundColor: "#f0f0f0",
  },
  thumbnail: {
    width: "100%",
    // aspectRatio is set dynamically via inline style
    borderRadius: 8,
    maxHeight: 300,
  },
  imageCountBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  // Reactions
  reactionBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
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
  // Comment section
  commentSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  commentCountText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    marginBottom: 6,
  },
  // Latest comment card
  latestCommentCard: {
    backgroundColor: "#f8f9fb",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  latestCommentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  latestCommentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e0e7ef",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  latestCommentAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4a6fa5",
  },
  latestCommentAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4a6fa5",
    flexShrink: 1,
  },
  editedLabel: {
    fontSize: 10,
    color: "#999",
    marginLeft: 4,
  },
  latestCommentActions: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: 8,
  },
  commentActionEdit: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4a6fa5",
  },
  commentActionDelete: {
    fontSize: 11,
    fontWeight: "600",
    color: "#c00",
  },
  latestCommentContent: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  // Edit inline
  editInput: {
    borderWidth: 1,
    borderColor: "#4a6fa5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#222",
    backgroundColor: "#fff",
    maxHeight: 80,
    marginBottom: 6,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  editCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  editSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#4a6fa5",
  },
  editSaveText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  // Add comment
  addCommentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#222",
    backgroundColor: "#fff",
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: "#4a6fa5",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
