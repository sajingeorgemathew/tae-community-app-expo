import React from "react";
import {
  ActivityIndicator,
  Button,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";

export default function MeScreen() {
  const { signOut } = useAuth();
  const { profile, avatarUrl, loading, error, refresh } = useMyProfile();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error ?? "Profile not found"}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={refresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {(profile.full_name ?? "?")[0].toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.title}>{profile.full_name ?? "No name"}</Text>
      <Text style={styles.role}>{profile.role}</Text>

      {profile.headline ? (
        <Text style={styles.headline}>{profile.headline}</Text>
      ) : null}

      {profile.program || profile.grad_year ? (
        <Text style={styles.subtitle}>
          {[profile.program, profile.grad_year].filter(Boolean).join(" · ")}
        </Text>
      ) : null}

      <View style={styles.spacer} />
      <Button title="Refresh" onPress={refresh} />
      <View style={styles.spacerSmall} />
      <Button title="Sign Out" onPress={signOut} color="#c00" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "bold", color: "#555" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  role: { fontSize: 14, color: "#888", textTransform: "capitalize", marginBottom: 8 },
  headline: { fontSize: 14, color: "#444", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#666" },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  spacer: { height: 24 },
  spacerSmall: { height: 8 },
});
