import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Profile } from "@tae/shared";
import { createSignedUrl, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "../lib/supabase";
import { displayRole, roleBadgeColors } from "../lib/roles";
import type { MoreStackParamList } from "../navigation/MoreStack";

type Props = NativeStackScreenProps<MoreStackParamList, "AdminMembers">;

const FETCH_LIMIT = 200;

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function MemberRow({
  profile,
  avatarUrl,
  onPress,
}: {
  profile: Profile;
  avatarUrl?: string;
  onPress: () => void;
}) {
  const badge = roleBadgeColors(profile.role);
  const name = profile.full_name || "Unknown";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitial}>{name[0].toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {profile.is_disabled && (
            <View style={styles.disabledBadge}>
              <Text style={styles.disabledBadgeText}>DISABLED</Text>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: badge.bg, borderColor: badge.border },
            ]}
          >
            <Text style={[styles.roleBadgeText, { color: badge.text }]}>
              {displayRole(profile.role).toUpperCase()}
            </Text>
          </View>
          {profile.is_listed_as_tutor && (
            <Text style={styles.tutorTag}>Instructor Listed</Text>
          )}
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AdminMembersScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
      setError(fetchError?.message ?? "Failed to load members");
      setLoading(false);
      return;
    }

    const list = data as Profile[];
    setProfiles(list);
    setLoading(false);

    // Resolve avatar signed URLs
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
    fetchProfiles();
  }, [fetchProfiles]);

  // Re-fetch when coming back from detail (member may have been updated)
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (!loading) fetchProfiles();
    });
    return unsub;
  }, [navigation, loading, fetchProfiles]);

  const getAvatarUrl = (path: string | null): string | undefined => {
    if (!path) return undefined;
    return avatarUrls[path] ?? avatarCache.current.get(path);
  };

  const filtered = search.trim()
    ? profiles.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.full_name?.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q) ||
          p.program?.toLowerCase().includes(q)
        );
      })
    : profiles;

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading members...</Text>
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
    <View style={styles.root}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MemberRow
            profile={item}
            avatarUrl={getAvatarUrl(item.avatar_path)}
            onPress={() =>
              navigation.navigate("AdminMemberDetail", { profileId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f5f5" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
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
  emptyText: { fontSize: 15, color: "#888" },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    color: "#222",
  },
  list: { paddingBottom: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 18, fontWeight: "bold", color: "#555" },
  rowText: { flex: 1, marginLeft: 12 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  name: { fontSize: 15, fontWeight: "600", color: "#111", flexShrink: 1 },
  disabledBadge: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  disabledBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#b91c1c",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  tutorTag: { fontSize: 11, color: "#047857" },
  chevron: { fontSize: 22, color: "#bbb", marginLeft: 4 },
});
