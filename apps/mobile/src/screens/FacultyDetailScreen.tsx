import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import type { FacultyStackParamList } from "../navigation/FacultyStack";

type Props = NativeStackScreenProps<FacultyStackParamList, "FacultyDetail">;

function displayName(profile: Profile): string {
  return profile.full_name || "Unknown";
}

export default function FacultyDetailScreen({ route }: Props) {
  const { profileId } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(fetchError?.message ?? "Faculty member not found");
      setLoading(false);
      return;
    }

    const p = data as Profile;
    setProfile(p);

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
        <Text style={styles.errorText}>{error ?? "Faculty member not found"}</Text>
        <Pressable style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

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
      <Text style={styles.role}>{profile.role}</Text>

      {profile.headline ? (
        <Text style={styles.headline}>{profile.headline}</Text>
      ) : null}

      {profile.program || profile.grad_year ? (
        <Text style={styles.detail}>
          {[profile.program, profile.grad_year].filter(Boolean).join(" · ")}
        </Text>
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
  name: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  role: {
    fontSize: 14,
    color: "#888",
    textTransform: "capitalize",
    marginBottom: 8,
  },
  headline: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    marginBottom: 8,
  },
  detail: { fontSize: 13, color: "#666", marginBottom: 12 },
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
