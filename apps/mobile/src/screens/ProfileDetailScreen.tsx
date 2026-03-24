import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import { displayRole, roleBadgeColors } from "../lib/roles";
import { useAuth } from "../state/auth";
import type { DirectoryStackParamList } from "../navigation/DirectoryStack";

type Props = NativeStackScreenProps<DirectoryStackParamList, "ProfileDetail">;

function displayName(profile: Profile): string {
  return profile.full_name || "Unknown";
}

export default function ProfileDetailScreen({ route }: Props) {
  const { profileId } = route.params;
  const { session } = useAuth();
  const rootNav = useNavigation<any>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  const resolvedAvatarPath = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Profile not found");
      setLoading(false);
      return;
    }

    const p = data as Profile;
    setProfile(p);

    // Resolve avatar signed URL if needed
    if (p.avatar_path && p.avatar_path !== resolvedAvatarPath.current) {
      const result = await createSignedUrl(
        supabase,
        STORAGE_BUCKETS.PROFILE_AVATARS,
        p.avatar_path,
      );
      setAvatarUrl(result.signedUrl);
      resolvedAvatarPath.current = p.avatar_path;
    } else if (!p.avatar_path) {
      setAvatarUrl(null);
      resolvedAvatarPath.current = null;
    }

    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isSelf = session?.user?.id === profileId;

  const handleMessage = async () => {
    if (!profile || messaging || isSelf) return;
    setMessaging(true);
    try {
      const { data, error: rpcError } = await supabase.rpc(
        "create_conversation_1to1",
        { other_user_id: profile.id },
      );
      if (rpcError) throw new Error(rpcError.message);
      const conversationId = data as string;
      rootNav.navigate("Messages", {
        screen: "Conversation",
        params: { conversationId, otherUserName: displayName(profile) },
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not start conversation");
    } finally {
      setMessaging(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Profile not found"}</Text>
        <Pressable style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const badge = roleBadgeColors(profile.role);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>
            {displayName(profile)[0].toUpperCase()}
          </Text>
        </View>
      )}

      <Text style={styles.name}>{displayName(profile)}</Text>

      <View
        style={[
          styles.badge,
          { backgroundColor: badge.bg, borderColor: badge.border },
        ]}
      >
        <Text style={[styles.badgeText, { color: badge.text }]}>
          {displayRole(profile.role).toUpperCase()}
        </Text>
      </View>

      {profile.headline ? (
        <Text style={styles.headline}>{profile.headline}</Text>
      ) : null}

      {profile.program || profile.grad_year ? (
        <Text style={styles.detail}>
          {[profile.program, profile.grad_year].filter(Boolean).join(" \u00B7 ")}
        </Text>
      ) : null}

      {/* Action buttons */}
      {!isSelf ? (
        <Pressable
          style={[styles.messageBtn, messaging && styles.messageBtnDisabled]}
          onPress={handleMessage}
          disabled={messaging}
        >
          {messaging ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.messageBtnText}>Message</Text>
          )}
        </Pressable>
      ) : null}

      {profile.current_work ? (
        <DetailSection label="Current Work" value={profile.current_work} />
      ) : null}

      {profile.skills ? (
        <DetailSection label="Skills" value={profile.skills} />
      ) : null}

      {profile.qualifications ? (
        <DetailSection label="Qualifications" value={profile.qualifications} />
      ) : null}

      {profile.experience ? (
        <DetailSection label="Experience" value={profile.experience} />
      ) : null}
    </ScrollView>
  );
}

function DetailSection({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    alignItems: "center",
    padding: 24,
    paddingBottom: 48,
  },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 16 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "bold", color: "#555" },
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 6 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  headline: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    marginBottom: 8,
  },
  detail: { fontSize: 13, color: "#666", marginBottom: 12 },
  messageBtn: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  messageBtnDisabled: { opacity: 0.6 },
  messageBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  section: {
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionValue: { fontSize: 14, color: "#333", lineHeight: 20 },
  errorText: {
    fontSize: 16,
    color: "#c00",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
