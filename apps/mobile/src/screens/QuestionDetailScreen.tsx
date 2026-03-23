import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import type { QuestionsStackParamList } from "../navigation/QuestionsStack";
import {
  fetchQuestionById,
  fetchAnswersForQuestion,
  createAnswer,
  canSubmitAnswer,
  type QuestionDetail,
  type AnswerDetail,
} from "../lib/questions";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";

type Props = NativeStackScreenProps<QuestionsStackParamList, "QuestionDetail">;

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
      <Text style={styles.badgeText}>{role}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AnswerCard
// ---------------------------------------------------------------------------

function AnswerCard({
  answer,
  avatarUrl,
}: {
  answer: AnswerDetail;
  avatarUrl?: string;
}) {
  const showBadge =
    answer.author_role === "tutor" || answer.author_role === "admin";

  return (
    <View style={styles.answerCard}>
      <View style={styles.answerAuthorRow}>
        <Avatar name={answer.author_name} uri={avatarUrl} size={32} />
        <View style={styles.answerAuthorMeta}>
          <View style={styles.answerNameRow}>
            <Text style={styles.answerAuthor} numberOfLines={1}>
              {answer.author_name}
            </Text>
            {showBadge && <RoleBadge role={answer.author_role!} />}
          </View>
          <Text style={styles.answerDate}>
            {relativeTime(answer.created_at)}
          </Text>
        </View>
      </View>
      <Text style={styles.answerBody}>{answer.body}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// QuestionDetailScreen
// ---------------------------------------------------------------------------

export default function QuestionDetailScreen({ route }: Props) {
  const { questionId } = route.params;
  const { session } = useAuth();
  const { profile } = useMyProfile();
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Answer composer state
  const [answerBody, setAnswerBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const userCanAnswer = canSubmitAnswer(profile?.role);

  // Avatar signed URL cache & state
  const avatarCache = useRef<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const resolveAvatars = useCallback(
    async (q: QuestionDetail, a: AnswerDetail[]) => {
      const paths = new Set<string>();
      if (q.author_avatar_path && !avatarCache.current.has(q.author_avatar_path)) {
        paths.add(q.author_avatar_path);
      }
      for (const ans of a) {
        if (
          ans.author_avatar_path &&
          !avatarCache.current.has(ans.author_avatar_path)
        ) {
          paths.add(ans.author_avatar_path);
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
    },
    [],
  );

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, a] = await Promise.all([
        fetchQuestionById(questionId),
        fetchAnswersForQuestion(questionId),
      ]);
      setQuestion(q);
      setAnswers(a);
      resolveAvatars(q, a);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load question");
    } finally {
      setLoading(false);
    }
  }, [questionId, resolveAvatars]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmitAnswer = useCallback(async () => {
    const trimmed = answerBody.trim();
    if (!trimmed) {
      Alert.alert("Empty answer", "Please write something before submitting.");
      return;
    }
    const userId = session?.user.id;
    if (!userId) return;

    setSubmitting(true);
    try {
      await createAnswer(questionId, userId, trimmed);
      setAnswerBody("");
      // Refresh answers list
      const updated = await fetchAnswersForQuestion(questionId);
      setAnswers(updated);
      if (question) resolveAvatars(question, updated);
    } catch (e: unknown) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Failed to post answer",
      );
    } finally {
      setSubmitting(false);
    }
  }, [answerBody, session, questionId, question, resolveAvatars]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !question) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Question not found"}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={load} />
      </View>
    );
  }

  const header = (
    <View style={styles.questionSection}>
      {/* Question header card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionTitle}>{question.title}</Text>

        {/* Author row */}
        <View style={styles.authorRow}>
          <Avatar
            name={question.author_name}
            uri={getAvatarUrl(question.author_avatar_path)}
            size={36}
          />
          <View style={styles.authorMeta}>
            <Text style={styles.authorName} numberOfLines={1}>
              {question.author_name}
            </Text>
            <Text style={styles.authorDate}>
              {relativeTime(question.created_at)}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={styles.questionBody}>{question.body}</Text>
      </View>

      {/* Answers heading */}
      <View style={styles.answersHeading}>
        <Text style={styles.answersTitle}>
          {answers.length === 0
            ? "No answers yet"
            : answers.length === 1
              ? "1 Answer"
              : `${answers.length} Answers`}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.flex}>
        <FlatList
          data={answers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <AnswerCard
              answer={item}
              avatarUrl={getAvatarUrl(item.author_avatar_path)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyAnswers}>
              <Text style={styles.emptyText}>
                No answers have been posted yet.
              </Text>
            </View>
          }
        />

        {/* Answer composer / read-only notice */}
        {userCanAnswer ? (
          <View
            style={[
              styles.composerBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <TextInput
              style={styles.composerInput}
              placeholder="Write an answer..."
              placeholderTextColor="#94a3b8"
              value={answerBody}
              onChangeText={setAnswerBody}
              multiline
              editable={!submitting}
            />
            <TouchableOpacity
              style={[
                styles.composerButton,
                (!answerBody.trim() || submitting) &&
                  styles.composerButtonDisabled,
              ]}
              onPress={handleSubmitAnswer}
              disabled={!answerBody.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.composerButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.readOnlyBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <Text style={styles.readOnlyText}>
              Only tutors and admins can answer questions
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  spacer: { height: 16 },
  listContent: { padding: 16, paddingBottom: 80 },

  // Question section
  questionSection: { marginBottom: 8 },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
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
  authorDate: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 1,
  },
  questionBody: {
    fontSize: 15,
    color: "#222",
    lineHeight: 22,
  },

  // Answers heading
  answersHeading: {
    paddingTop: 8,
    marginBottom: 4,
  },
  answersTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },

  // Answer cards
  answerCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  answerAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  answerAuthorMeta: {
    marginLeft: 10,
    flex: 1,
  },
  answerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  answerAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  answerDate: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 1,
  },
  answerBody: { fontSize: 14, color: "#333", lineHeight: 20 },

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

  // Empty answers
  emptyAnswers: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, color: "#888", fontStyle: "italic" },

  // Layout
  flex: { flex: 1 },

  // Answer composer
  composerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  composerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  composerButton: {
    marginLeft: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  composerButtonDisabled: {
    opacity: 0.5,
  },
  composerButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  // Read-only notice
  readOnlyBar: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  readOnlyText: {
    fontSize: 13,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});
