import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import type { Profile } from "@tae/shared";
import type { MeStackParamList } from "../navigation/MeStack";
import { useAuth } from "../state/auth";
import { useMyProfile } from "../state/profile";
import { fetchUserPosts, type FeedPost } from "../lib/posts";

type Props = NativeStackScreenProps<MeStackParamList, "MeHome">;

// ---------------------------------------------------------------------------
// Profile completeness
// ---------------------------------------------------------------------------

interface CompletenessField {
  key: keyof Profile;
  label: string;
}

const COMPLETENESS_FIELDS: CompletenessField[] = [
  { key: "full_name", label: "Full name" },
  { key: "headline", label: "Headline" },
  { key: "avatar_path", label: "Profile photo" },
  { key: "program", label: "Program" },
  { key: "grad_year", label: "Graduation year" },
  { key: "current_work", label: "Current work" },
  { key: "qualifications", label: "Qualifications" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
];

function computeCompleteness(profile: Profile) {
  const filled: string[] = [];
  const missing: string[] = [];

  for (const f of COMPLETENESS_FIELDS) {
    const val = profile[f.key];
    const isFilled =
      val !== null && val !== undefined && val !== "" && val !== false;
    if (isFilled) {
      filled.push(f.label);
    } else {
      missing.push(f.label);
    }
  }

  const pct = Math.round((filled.length / COMPLETENESS_FIELDS.length) * 100);
  return { pct, filled, missing };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileHeader({
  profile,
  avatarUrl,
  uploading,
  onChangeAvatar,
}: {
  profile: Profile;
  avatarUrl: string | null;
  uploading: boolean;
  onChangeAvatar: () => void;
}) {
  return (
    <View style={styles.headerSection}>
      <TouchableOpacity onPress={onChangeAvatar} disabled={uploading}>
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

      <Text style={styles.name}>{profile.full_name ?? "No name"}</Text>
      <Text style={styles.role}>{profile.role}</Text>

      {profile.headline ? (
        <Text style={styles.headline}>{profile.headline}</Text>
      ) : null}

      {profile.program || profile.grad_year ? (
        <Text style={styles.meta}>
          {[profile.program, profile.grad_year].filter(Boolean).join(" · ")}
        </Text>
      ) : null}

      {profile.current_work ? (
        <Text style={styles.meta}>{profile.current_work}</Text>
      ) : null}

      {profile.qualifications ? (
        <Text style={styles.detail}>
          <Text style={styles.detailLabel}>Qualifications: </Text>
          {profile.qualifications}
        </Text>
      ) : null}

      {profile.experience ? (
        <Text style={styles.detail}>
          <Text style={styles.detailLabel}>Experience: </Text>
          {profile.experience}
        </Text>
      ) : null}

      {profile.skills ? (
        <Text style={styles.detail}>
          <Text style={styles.detailLabel}>Skills: </Text>
          {profile.skills}
        </Text>
      ) : null}
    </View>
  );
}

function CompletenessCard({
  profile,
  onEdit,
}: {
  profile: Profile;
  onEdit: () => void;
}) {
  const { pct, missing } = computeCompleteness(profile);

  if (pct === 100) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Profile completeness — {pct}%</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
      {missing.length > 0 ? (
        <Text style={styles.missingText}>
          Missing: {missing.join(", ")}
        </Text>
      ) : null}
      <View style={styles.cardAction}>
        <Button title="Complete Profile" onPress={onEdit} />
      </View>
    </View>
  );
}

function MyPostCard({
  post,
  onPress,
}: {
  post: FeedPost;
  onPress: () => void;
}) {
  const preview =
    post.content.length > 140
      ? post.content.slice(0, 140) + "…"
      : post.content;

  return (
    <Pressable style={styles.postCard} onPress={onPress}>
      <View style={styles.postCardHeader}>
        <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
      </View>
      <Text style={styles.postContent}>{preview}</Text>
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postThumbnail}
          resizeMode="cover"
        />
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function MeScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const { session } = useAuth();
  const { profile, avatarUrl, loading, error, refresh, uploadAvatar } =
    useMyProfile();
  const [uploading, setUploading] = useState(false);

  // My Posts state
  const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  const loadMyPosts = useCallback(async () => {
    if (!userId) return;
    setPostsLoading(true);
    setPostsError(null);
    try {
      const data = await fetchUserPosts(userId);
      setMyPosts(data);
    } catch (e: unknown) {
      setPostsError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setPostsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadMyPosts();
  }, [loadMyPosts]);

  useFocusEffect(
    useCallback(() => {
      loadMyPosts();
    }, [loadMyPosts]),
  );

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
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Profile not found"}</Text>
        <View style={styles.spacer} />
        <Button title="Retry" onPress={refresh} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Profile header */}
      <ProfileHeader
        profile={profile}
        avatarUrl={avatarUrl}
        uploading={uploading}
        onChangeAvatar={handleChangeAvatar}
      />

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          title="Edit Profile"
          onPress={() => navigation.navigate("EditProfile")}
        />
        <View style={styles.spacerSmall} />
        <Button title="Refresh" onPress={refresh} />
        <View style={styles.spacerSmall} />
        <Button title="Sign Out" onPress={signOut} color="#c00" />
      </View>

      {/* Completeness card */}
      <CompletenessCard
        profile={profile}
        onEdit={() => navigation.navigate("EditProfile")}
      />

      {/* My Posts section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Posts</Text>

        {postsLoading ? (
          <ActivityIndicator style={styles.postsLoader} />
        ) : postsError ? (
          <View>
            <Text style={styles.errorText}>{postsError}</Text>
            <View style={styles.spacerSmall} />
            <Button title="Retry" onPress={loadMyPosts} />
          </View>
        ) : myPosts.length === 0 ? (
          <Text style={styles.emptyText}>
            You haven't posted anything yet.
          </Text>
        ) : (
          myPosts.map((post) => (
            <MyPostCard
              key={post.id}
              post={post}
              onPress={() =>
                navigation.navigate("PostDetail", { postId: post.id })
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 24, paddingBottom: 48 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  // Profile header
  headerSection: { alignItems: "center", marginBottom: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 8 },
  avatarPlaceholder: {
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "bold", color: "#555" },
  avatarLabel: {
    fontSize: 13,
    color: "#007AFF",
    marginTop: 4,
    textAlign: "center" as const,
  },
  name: { fontSize: 22, fontWeight: "bold", marginTop: 8, marginBottom: 2 },
  role: {
    fontSize: 14,
    color: "#888",
    textTransform: "capitalize",
    marginBottom: 6,
  },
  headline: {
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    marginBottom: 4,
  },
  meta: { fontSize: 13, color: "#666", marginBottom: 2 },
  detail: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  detailLabel: { fontWeight: "600" },

  // Actions
  actions: { marginBottom: 16 },

  // Completeness card
  card: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  progressBarBg: {
    height: 8,
    backgroundColor: "#ddd",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  missingText: { fontSize: 12, color: "#888", marginBottom: 8 },
  cardAction: { alignItems: "flex-start" },

  // My Posts section
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  postsLoader: { marginVertical: 16 },
  emptyText: { fontSize: 14, color: "#999", textAlign: "center" },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  postCardHeader: { marginBottom: 6 },
  postDate: { fontSize: 12, color: "#888" },
  postContent: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 6 },
  postThumbnail: { width: "100%", height: 160, borderRadius: 6 },

  // General
  errorText: { fontSize: 16, color: "#c00", textAlign: "center" },
  spacer: { height: 24 },
  spacerSmall: { height: 8 },
});
