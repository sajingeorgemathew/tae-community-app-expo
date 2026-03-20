import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import { useAuth } from "../state/auth";
import { createPost } from "../lib/posts";

type Nav = NativeStackNavigationProp<FeedStackParamList, "NewPost">;

export default function NewPostScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const [content, setContent] = useState("");
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
      await createPost(userId, content.trim());
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
