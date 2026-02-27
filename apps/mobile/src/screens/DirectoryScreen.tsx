import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import type { DirectoryStackParamList } from "../navigation/DirectoryStack";

type Props = NativeStackScreenProps<DirectoryStackParamList, "DirectoryList">;

const FETCH_LIMIT = 100;

/** Resolve display name with safe fallback order. */
function displayName(profile: Profile): string {
  return profile.full_name || "Unknown";
}

/** Secondary line: role + program/grad_year when available. */
function secondaryLine(profile: Profile): string {
  const parts: string[] = [profile.role];
  if (profile.program) parts.push(profile.program);
  if (profile.grad_year) parts.push(String(profile.grad_year));
  return parts.join(" · ");
}

export default function DirectoryScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache: avatar_path → signed URL
  const avatarCache = useRef<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true })
      .limit(FETCH_LIMIT);

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Failed to load directory");
      setLoading(false);
      return;
    }

    const list = data as Profile[];
    setProfiles(list);
    setLoading(false);

    // Resolve avatar signed URLs for profiles that have avatar_path
    const toResolve = list.filter(
      (p) => p.avatar_path && !avatarCache.current.has(p.avatar_path),
    );

    if (toResolve.length > 0) {
      const resolved: Record<string, string> = {};
      await Promise.all(
        toResolve.map(async (p) => {
          if (!p.avatar_path) return;
          const result = await createSignedUrl(
            supabase,
            STORAGE_BUCKETS.PROFILE_AVATARS,
            p.avatar_path,
          );
          if (result.signedUrl) {
            avatarCache.current.set(p.avatar_path!, result.signedUrl);
            resolved[p.avatar_path!] = result.signedUrl;
          }
        }),
      );
      // Merge newly resolved URLs into state
      setAvatarUrls((prev) => ({ ...prev, ...resolved }));
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading directory…</Text>
      </View>
    );
  }

  if (error && profiles.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchProfiles}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const url = getAvatarUrl(item.avatar_path);
        return (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("ProfileDetail", { profileId: item.id })
            }
          >
            {url ? (
              <Image source={{ uri: url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {displayName(item)[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName(item)}
              </Text>
              <Text style={styles.secondary} numberOfLines={1}>
                {secondaryLine(item)}
              </Text>
            </View>
          </Pressable>
        );
      }}
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
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  errorText: { fontSize: 16, color: "#c00", textAlign: "center", marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "bold", color: "#555" },
  info: { marginLeft: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#111" },
  secondary: { fontSize: 13, color: "#666", marginTop: 2 },
});
