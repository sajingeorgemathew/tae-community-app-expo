import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedPost } from "../lib/posts";
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
}

const CONTENT_PREVIEW_LIMIT = 200;

// Preview aspect-ratio bounds: clamp between 1:1 (square) and 2.5:1 (wide banner).
// Images within the "normal" range use cover; extreme ratios use contain so the
// full image is visible with letterboxing instead of aggressive cropping.
const MIN_PREVIEW_AR = 1; // tallest allowed (square)
const MAX_PREVIEW_AR = 2.5; // widest allowed
const NORMAL_AR_LOW = 0.8; // below this → contain (very tall)
const NORMAL_AR_HIGH = 2.2; // above this → contain (very wide)

export default function PostCard({ post, onPress, onImagePress, onReactionPress, hideAuthor }: PostCardProps) {
  const authorName = post.profiles?.full_name ?? "Unknown";
  const preview =
    post.content.length > CONTENT_PREVIEW_LIMIT
      ? post.content.slice(0, CONTENT_PREVIEW_LIMIT) + "…"
      : post.content;
  const imageCount = post.attachments.filter((a) => a.type === "image").length;
  const [imgError, setImgError] = useState(false);
  const [detectedAR, setDetectedAR] = useState<number | null>(null);

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

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
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
        </View>
      )}

      {/* Date-only row when author is hidden */}
      {hideAuthor && (
        <Text style={styles.timestampOnly}>{relativeTime(post.created_at)}</Text>
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

      {/* Comment preview */}
      {(post.commentCount > 0 || post.latestComment) && (
        <View style={styles.commentPreview}>
          {post.commentCount > 0 && (
            <Text style={styles.commentCountText}>
              {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
            </Text>
          )}
          {post.latestComment && (
            <View style={styles.latestCommentRow}>
              <Text style={styles.latestCommentAuthor} numberOfLines={1}>
                {post.latestComment.author_name}
              </Text>
              <Text style={styles.latestCommentContent} numberOfLines={2}>
                {post.latestComment.content}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
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
    marginBottom: 8,
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
  // Comment preview
  commentPreview: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  commentCountText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
    marginBottom: 4,
  },
  latestCommentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  latestCommentAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4a6fa5",
    flexShrink: 0,
  },
  latestCommentContent: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    lineHeight: 18,
  },
});
