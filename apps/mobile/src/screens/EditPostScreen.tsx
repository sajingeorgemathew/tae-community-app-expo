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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { FeedStackParamList } from "../navigation/FeedStack";
import { updatePost } from "../lib/posts";

type Props = NativeStackScreenProps<FeedStackParamList, "EditPost">;

export default function EditPostScreen({ route, navigation }: Props) {
  const { postId, content: initialContent } = route.params;
  const [content, setContent] = useState(initialContent);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = content.trim().length > 0 && content.trim() !== initialContent.trim() && !submitting;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updatePost(postId, content);
      navigation.goBack();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to update post";
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
        placeholder="Post content"
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
          <Button title="Save" onPress={handleSave} disabled={!canSubmit} />
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
