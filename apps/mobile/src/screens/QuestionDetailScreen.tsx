import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { QuestionsStackParamList } from "../navigation/QuestionsStack";
import {
  fetchQuestionById,
  fetchAnswersForQuestion,
  type QuestionDetail,
  type AnswerDetail,
} from "../lib/questions";

type Props = NativeStackScreenProps<QuestionsStackParamList, "QuestionDetail">;

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

function AnswerCard({ answer }: { answer: AnswerDetail }) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.answerHeader}>
        <Text style={styles.answerAuthor}>{answer.author_name}</Text>
        <Text style={styles.answerDate}>{formatDate(answer.created_at)}</Text>
      </View>
      <Text style={styles.answerBody}>{answer.body}</Text>
    </View>
  );
}

export default function QuestionDetailScreen({ route }: Props) {
  const { questionId } = route.params;
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load question");
    } finally {
      setLoading(false);
    }
  }, [questionId]);

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
      <Text style={styles.questionTitle}>{question.title}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaAuthor}>{question.author_name}</Text>
        <Text style={styles.metaDate}>{formatDate(question.created_at)}</Text>
      </View>
      <Text style={styles.questionBody}>{question.body}</Text>

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
    <FlatList
      data={answers}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => <AnswerCard answer={item} />}
      ListEmptyComponent={
        <View style={styles.emptyAnswers}>
          <Text style={styles.emptyText}>
            No answers have been posted yet.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  spacer: { height: 16 },
  container: { padding: 16, paddingBottom: 32 },

  // Question section
  questionSection: { marginBottom: 8 },
  questionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  metaAuthor: { fontSize: 14, fontWeight: "600", color: "#444" },
  metaDate: { fontSize: 12, color: "#888" },
  questionBody: {
    fontSize: 15,
    color: "#222",
    lineHeight: 22,
    marginBottom: 20,
  },

  // Answers heading
  answersHeading: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
    marginBottom: 4,
  },
  answersTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },

  // Answer cards
  answerCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  answerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  answerAuthor: { fontSize: 13, fontWeight: "600", color: "#444" },
  answerDate: { fontSize: 11, color: "#888" },
  answerBody: { fontSize: 14, color: "#333", lineHeight: 20 },

  // Empty answers
  emptyAnswers: { alignItems: "center", paddingVertical: 24 },
  emptyText: { fontSize: 14, color: "#888", fontStyle: "italic" },
});
