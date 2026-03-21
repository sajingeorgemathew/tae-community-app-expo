import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { FeedPost } from "../lib/posts";

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
  /** Hide the author row (e.g. on My Posts where it's redundant) */
  hideAuthor?: boolean;
}

const CONTENT_PREVIEW_LIMIT = 200;

export default function PostCard({ post, onPress, hideAuthor }: PostCardProps) {
  const authorName = post.profiles?.full_name ?? "Unknown";
  const preview =
    post.content.length > CONTENT_PREVIEW_LIMIT
      ? post.content.slice(0, CONTENT_PREVIEW_LIMIT) + "…"
      : post.content;
  const imageCount = post.attachments.filter((a) => a.type === "image").length;
  const [imgError, setImgError] = useState(false);

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
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
          {imageCount > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>+{imageCount - 1}</Text>
            </View>
          )}
        </View>
      ) : null}
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
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
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
});
