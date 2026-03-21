import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import { useAuth } from "../state/auth";
import { createPost } from "../lib/posts";

type Nav = NativeStackNavigationProp<FeedStackParamList, "NewPost">;

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All Members" },
  { value: "students", label: "Students" },
  { value: "alumni", label: "Alumni" },
] as const;

type Audience = (typeof AUDIENCE_OPTIONS)[number]["value"];

export default function NewPostScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    const userId = session?.user.id;
    if (!userId) {
      Alert.alert("Error", "You must be signed in to create a post.");
      return;
    }

    setSubmitting(true);
    try {
      await createPost(userId, content.trim(), audience);
      navigation.goBack();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create post";
      Alert.alert("Error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.audienceRow}>
        {AUDIENCE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.audienceChip,
              audience === opt.value && styles.audienceChipActive,
            ]}
            onPress={() => setAudience(opt.value)}
            disabled={submitting}
          >
            <Text
              style={[
                styles.audienceLabel,
                audience === opt.value && styles.audienceLabelActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        multiline
        autoFocus
        value={content}
        onChangeText={setContent}
        editable={!submitting}
      />
      <View style={styles.footer}>
        {submitting ? (
          <ActivityIndicator />
        ) : (
          <Button title="Post" onPress={handleSubmit} disabled={!canSubmit} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  audienceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  audienceChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  audienceChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  audienceLabel: {
    fontSize: 14,
    color: "#333",
  },
  audienceLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: "top",
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 12,
    paddingBottom: 24,
    alignItems: "flex-end",
  },
});
