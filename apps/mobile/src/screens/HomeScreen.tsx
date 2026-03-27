import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Lightweight image-preview aspect-ratio helpers (mirrors PostCard constants
// but kept inline so Home doesn't depend on the full Feed card).
// ---------------------------------------------------------------------------
const MIN_PREVIEW_AR = 1; // tallest allowed (square)
const MAX_PREVIEW_AR = 2.5; // widest allowed
const NORMAL_AR_LOW = 0.8; // below → contain (very tall)
const NORMAL_AR_HIGH = 2.2; // above → contain (very wide)
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { AppTabsParamList } from "../navigation/AppTabs";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";
import { fetchDashboardData, type DashboardData } from "../lib/home";
import { onMessagingStateChange } from "../lib/messagingEvents";
import type { FeedPost } from "../lib/posts";

type TabNav = BottomTabNavigationProp<AppTabsParamList>;

// ---------------------------------------------------------------------------
// Small sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.summaryCard} onPress={onPress}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  );
}

function PostPreviewCard({
  post,
  onPress,
}: {
  post: FeedPost;
  onPress: () => void;
}) {
  const authorName = post.profiles?.full_name ?? "Unknown";
  const preview =
    post.content.length > 100
      ? post.content.slice(0, 100) + "…"
      : post.content;

  // Detect real aspect ratio so the preview avoids aggressive cropping
  const [detectedAR, setDetectedAR] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!post.imageUrl) return;
    Image.getSize(
      post.imageUrl,
      (w, h) => { if (h > 0) setDetectedAR(w / h); },
      () => { /* fall back to default 16:9 */ },
    );
  }, [post.imageUrl]);

  const previewAR = detectedAR
    ? Math.min(MAX_PREVIEW_AR, Math.max(MIN_PREVIEW_AR, detectedAR))
    : 16 / 9;
  const useContain =
    detectedAR != null &&
    (detectedAR < NORMAL_AR_LOW || detectedAR > NORMAL_AR_HIGH);

  return (
    <Pressable style={styles.postCard} onPress={onPress}>
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{authorName}</Text>
      </View>
      <Text style={styles.postContent}>{preview}</Text>
      {post.imageUrl && !imgError ? (
        <View
          style={[
            styles.postImageWrapper,
            useContain && styles.postImageWrapperContain,
          ]}
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={[styles.postThumbnail, { aspectRatio: previewAR }]}
            resizeMode={useContain ? "contain" : "cover"}
            onError={() => setImgError(true)}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { session } = useAuth();
  const { profile } = useMyProfile();
  const navigation = useNavigation<TabNav>();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(session.user.id);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      // Poll for updates while the screen stays visible (e.g. new messages
      // from other users). The interval is cleared when the screen loses focus.
      const id = setInterval(() => { load(); }, 15_000);
      return () => clearInterval(id);
    }, [load]),
  );

  // Refresh dashboard when messaging state changes (send/read) so the
  // unread count updates without requiring a tab switch.
  useEffect(() => onMessagingStateChange(load), [load]);

  // --- Welcome header ---
  const displayName = profile?.full_name?.split(" ")[0] ?? "Member";

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      {/* Welcome header */}
      <Text style={styles.welcomeText}>Welcome back, {displayName}</Text>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("Feed", { screen: "NewPost" })
            }
          >
            <Text style={styles.actionButtonText}>Create Post</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("More", { screen: "QuestionsList" })
            }
          >
            <Text style={styles.actionButtonText}>Ask Question</Text>
          </Pressable>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.summaryRow}>
          <SummaryCard
            label="Unread Messages"
            value={String(data?.unreadMessages ?? 0)}
            onPress={() => navigation.navigate("Messages", { screen: "MessagesList" as never })}
          />
          <SummaryCard
            label="Q&A Topics"
            value={String(data?.questionsCount ?? 0)}
            onPress={() => navigation.navigate("More", { screen: "QuestionsList" })}
          />
          <SummaryCard
            label="Online Members"
            // TODO: Replace with real presence count once a heartbeat system exists
            value={data?.onlineMembers != null ? String(data.onlineMembers) : "—"}
          />
        </View>
      </View>

      {/* Directory shortcut */}
      <View style={styles.section}>
        <Pressable
          style={styles.directoryShortcut}
          onPress={() =>
            navigation.navigate("More", { screen: "DirectoryList" })
          }
        >
          <Text style={styles.directoryShortcutText}>
            Browse Member Directory →
          </Text>
        </Pressable>
      </View>

      {/* Recent posts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Posts</Text>
        {data?.recentPosts.length ? (
          data.recentPosts.map((post) => (
            <PostPreviewCard
              key={post.id}
              post={post}
              onPress={() =>
                navigation.navigate("Feed", {
                  screen: "PostDetail",
                  params: { postId: post.id },
                })
              }
            />
          ))
        ) : (
          <Text style={styles.emptyText}>No posts yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  container: { padding: 16, paddingBottom: 32 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  emptyText: { fontSize: 14, color: "#888", textAlign: "center", padding: 16 },
  spacer: { height: 16 },

  // Welcome
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
    color: "#222",
  },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#444",
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  // Summary cards
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },

  // Directory shortcut
  directoryShortcut: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  directoryShortcutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },

  // Post preview cards
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  postHeader: {
    marginBottom: 6,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  postContent: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  postImageWrapper: {
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 8,
  },
  postImageWrapperContain: {
    backgroundColor: "#f0f0f0",
  },
  postThumbnail: {
    width: "100%",
    // aspectRatio set dynamically via inline style
    borderRadius: 6,
    maxHeight: 200,
  },
});
