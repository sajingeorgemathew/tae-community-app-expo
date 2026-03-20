import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MeStackParamList } from "../navigation/MeStack";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";

type Props = NativeStackScreenProps<MeStackParamList, "MeHome">;

export default function MeScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { profile, avatarUrl, loading, error, refresh, uploadAvatar } =
    useMyProfile();
  const [uploading, setUploading] = useState(false);

  const handleChangeAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const fileName = asset.fileName ?? uri.split("/").pop() ?? "avatar.jpg";
    const mimeType = asset.mimeType ?? "image/jpeg";

    setUploading(true);
    try {
      await uploadAvatar(uri, fileName, mimeType);
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Could not upload avatar",
      );
    } finally {
      setUploading(false);
    }
  }, [uploadAvatar]);

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
      <TouchableOpacity onPress={handleChangeAvatar} disabled={uploading}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {(profile.full_name ?? "?")[0].toUpperCase()}
            </Text>
          </View>
        )}
        {uploading ? (
          <ActivityIndicator style={styles.avatarLabel} />
        ) : (
          <Text style={styles.avatarLabel}>Change Avatar</Text>
        )}
      </TouchableOpacity>

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
      <Button
        title="Edit Profile"
        onPress={() => navigation.navigate("EditProfile")}
      />
      <View style={styles.spacerSmall} />
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
  avatarLabel: { fontSize: 13, color: "#007AFF", marginTop: 4, textAlign: "center" as const },
});
