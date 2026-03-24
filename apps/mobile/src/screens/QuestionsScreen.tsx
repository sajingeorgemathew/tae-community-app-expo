import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import type { QuestionsStackParamList } from "../navigation/QuestionsStack";
import {
  fetchQuestionsFeed,
  type QuestionFeedRow,
} from "../lib/questions";
import { supabase } from "../lib/supabase";
import { displayRole } from "../lib/roles";

type Nav = NativeStackNavigationProp<QuestionsStackParamList, "QuestionsList">;

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
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function replyCountLabel(count: number): string {
  if (count === 0) return "No replies yet";
  if (count === 1) return "1 reply";
  return `${count} replies`;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

function Avatar({
  name,
  uri,
  size = 36,
}: {
  name: string | null;
  uri?: string;
  size?: number;
}) {
  const half = size / 2;
  const fontSize = size * 0.4;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: "#e2e8f0",
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: "#e2e8f0",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize, fontWeight: "700", color: "#4a6fa5" }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Role Badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayRole(role)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// QuestionCard
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  onPress,
  authorAvatarUrl,
  replierAvatarUrl,
}: {
  question: QuestionFeedRow;
  onPress: () => void;
  authorAvatarUrl?: string;
  replierAvatarUrl?: string;
}) {
  const authorName = question.author_name ?? "Unknown";
  const preview =
    question.body.length > 140
      ? question.body.slice(0, 140) + "…"
      : question.body;

  const showBadge =
    question.latest_replier_role === "tutor" ||
    question.latest_replier_role === "admin";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <Avatar name={authorName} uri={authorAvatarUrl} size={36} />
        <View style={styles.authorMeta}>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
          <Text style={styles.date}>{relativeTime(question.created_at)}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {question.title}
      </Text>

      {/* Body preview */}
      <Text style={styles.preview} numberOfLines={2}>
        {preview}
      </Text>

      {/* Reply section */}
      <View style={styles.replySection}>
        <Text
          style={[
            styles.replyCount,
            question.answer_count === 0 && styles.replyCountEmpty,
          ]}
        >
          {replyCountLabel(question.answer_count)}
        </Text>

        {question.answer_count > 0 && question.latest_replier_name && (
          <View style={styles.latestReplyRow}>
            <Avatar
              name={question.latest_replier_name}
              uri={replierAvatarUrl}
              size={20}
            />
            <Text style={styles.latestReplyText} numberOfLines={1}>
              Latest by {question.latest_replier_name}
            </Text>
            {showBadge && <RoleBadge role={question.latest_replier_role!} />}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// QuestionsScreen
// ---------------------------------------------------------------------------

export default function QuestionsScreen() {
  const navigation = useNavigation<Nav>();
  const [questions, setQuestions] = useState<QuestionFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Header "Ask" button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate("NewQuestion" as never)}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>Ask</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Avatar signed URL cache & state
  const avatarCache = useRef<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const resolveAvatars = useCallback(async (rows: QuestionFeedRow[]) => {
    const paths = new Set<string>();
    for (const q of rows) {
      if (q.author_avatar_path && !avatarCache.current.has(q.author_avatar_path)) {
        paths.add(q.author_avatar_path);
      }
      if (
        q.latest_replier_avatar_path &&
        !avatarCache.current.has(q.latest_replier_avatar_path)
      ) {
        paths.add(q.latest_replier_avatar_path);
      }
    }
    if (paths.size === 0) return;

    const resolved: Record<string, string> = {};
    await Promise.all(
      [...paths].map(async (p) => {
        const result = await createSignedUrl(
          supabase,
          STORAGE_BUCKETS.PROFILE_AVATARS,
          p,
        );
        if (result.signedUrl) {
          avatarCache.current.set(p, result.signedUrl);
          resolved[p] = result.signedUrl;
        }
      }),
    );
    if (Object.keys(resolved).length > 0) {
      setAvatarUrls((prev) => ({ ...prev, ...resolved }));
    }
  }, []);

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionsFeed();
      setQuestions(data);
      resolveAvatars(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [resolveAvatars]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No questions yet</Text>
        <View style={styles.spacer} />
        <Button title="Ask a Question" onPress={() => navigation.navigate("NewQuestion" as never)} />
        <View style={styles.spacer} />
        <Button title="Refresh" onPress={load} />
      </View>
    );
  }

  return (
    <FlatList
      data={questions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <QuestionCard
          question={item}
          authorAvatarUrl={getAvatarUrl(item.author_avatar_path)}
          replierAvatarUrl={getAvatarUrl(item.latest_replier_avatar_path)}
          onPress={() =>
            navigation.navigate("QuestionDetail", { questionId: item.id })
          }
        />
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  spacer: { height: 16 },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // Author row
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  authorMeta: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  date: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 1,
  },
  // Title & preview
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 10,
  },
  // Reply section
  replySection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  replyCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0d9488",
  },
  replyCountEmpty: {
    color: "#94a3b8",
    fontWeight: "400",
    fontStyle: "italic",
  },
  latestReplyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  latestReplyText: {
    fontSize: 13,
    color: "#64748b",
    marginLeft: 6,
    flex: 1,
  },
  // Role badge
  badge: {
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3b82f6",
  },
  // Header button
  headerButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  headerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
