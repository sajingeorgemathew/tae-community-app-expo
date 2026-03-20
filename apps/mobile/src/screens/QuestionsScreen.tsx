import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { QuestionsStackParamList } from "../navigation/QuestionsStack";
import {
  fetchQuestionsFeed,
  type QuestionFeedRow,
} from "../lib/questions";

type Nav = NativeStackNavigationProp<QuestionsStackParamList, "QuestionsList">;

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function QuestionCard({
  question,
  onPress,
}: {
  question: QuestionFeedRow;
  onPress: () => void;
}) {
  const authorName = question.author_name ?? "Unknown";
  const preview =
    question.body.length > 120
      ? question.body.slice(0, 120) + "…"
      : question.body;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Text style={styles.title} numberOfLines={2}>
        {question.title}
      </Text>
      <View style={styles.cardHeader}>
        <Text style={styles.authorName}>{authorName}</Text>
        <Text style={styles.date}>{formatDate(question.created_at)}</Text>
      </View>
      <Text style={styles.preview} numberOfLines={2}>
        {preview}
      </Text>
      <Text style={styles.answerCount}>
        {question.answer_count === 0
          ? "No answers yet"
          : question.answer_count === 1
            ? "1 answer"
            : `${question.answer_count} answers`}
      </Text>
    </Pressable>
  );
}

export default function QuestionsScreen() {
  const navigation = useNavigation<Nav>();
  const [questions, setQuestions] = useState<QuestionFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuestionsFeed();
      setQuestions(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, []);

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
          onPress={() =>
            navigation.navigate("QuestionDetail", { questionId: item.id })
          }
        />
      )}
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
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  spacer: { height: 16 },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  authorName: { fontSize: 13, fontWeight: "500", color: "#555" },
  date: { fontSize: 12, color: "#888" },
  preview: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 8 },
  answerCount: { fontSize: 12, color: "#0d9488", fontWeight: "500" },
});
