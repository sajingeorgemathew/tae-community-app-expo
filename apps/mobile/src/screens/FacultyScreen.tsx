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
import type { FacultyStackParamList } from "../navigation/FacultyStack";

type Props = NativeStackScreenProps<FacultyStackParamList, "FacultyList">;

const FETCH_LIMIT = 100;

function displayName(profile: Profile): string {
  return profile.full_name || "Unknown";
}

function secondaryLine(profile: Profile): string {
  const parts: string[] = [profile.role];
  if (profile.program) parts.push(profile.program);
  if (profile.qualifications) parts.push(profile.qualifications);
  return parts.join(" · ");
}

export default function FacultyScreen({ navigation }: Props) {
  const [faculty, setFaculty] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avatarCache = useRef<Map<string, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  const fetchFaculty = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .or("is_listed_as_tutor.eq.true,role.eq.tutor")
      .eq("is_disabled", false)
      .order("full_name", { ascending: true })
      .limit(FETCH_LIMIT);

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Failed to load faculty");
      setLoading(false);
      return;
    }

    const list = data as Profile[];
    setFaculty(list);
    setLoading(false);

    // Resolve avatar signed URLs in background
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
      setAvatarUrls((prev) => ({ ...prev, ...resolved }));
    }
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  if (loading && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading faculty…</Text>
      </View>
    );
  }

  if (error && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchFaculty}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!loading && faculty.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No faculty members found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={faculty}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const url = getAvatarUrl(item.avatar_path);
        return (
          <Pressable
            style={styles.row}
            onPress={() =>
              navigation.navigate("FacultyDetail", { profileId: item.id })
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
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
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
