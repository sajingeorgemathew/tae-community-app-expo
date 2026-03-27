import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MoreStackParamList } from "../navigation/MoreStack";
import {
  fetchFeedPosts,
  deletePost,
  type FeedPost,
} from "../lib/posts";
import { useMyProfile } from "../state/profile";
import PostCard from "../components/PostCard";

type Props = NativeStackScreenProps<MoreStackParamList, "AdminPostsModeration">;

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type AudienceFilter = "all" | "students" | "alumni";
type TimeFilter = "none" | "1h" | "2h" | "3h" | "24h";

const AUDIENCE_OPTIONS: { label: string; value: AudienceFilter }[] = [
  { label: "All", value: "all" },
  { label: "Students", value: "students" },
  { label: "Alumni", value: "alumni" },
];

const TIME_OPTIONS: { label: string; value: TimeFilter; hours: number | null }[] = [
  { label: "Any time", value: "none", hours: null },
  { label: "1 hr", value: "1h", hours: 1 },
  { label: "2 hr", value: "2h", hours: 2 },
  { label: "3 hr", value: "3h", hours: 3 },
  { label: "24 hr", value: "24h", hours: 24 },
];

// ---------------------------------------------------------------------------
// Filter chip component
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Moderation wrapper — reuses the Feed PostCard with selection & admin controls
// ---------------------------------------------------------------------------

function ModerationPostItem({
  post,
  selected,
  onToggleSelect,
  onDelete,
}: {
  post: FeedPost;
  selected: boolean;
  onToggleSelect: (postId: string) => void;
  onDelete: (postId: string) => void;
}) {
  const audience = post.audience ?? "all";

  return (
    <View style={[styles.moderationItem, selected && styles.moderationItemSelected]}>
      {/* Moderation bar: checkbox + audience badge + delete */}
      <View style={styles.moderationBar}>
        <Pressable
          style={[styles.checkbox, selected && styles.checkboxChecked]}
          onPress={() => onToggleSelect(post.id)}
          hitSlop={8}
        >
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>

        <View style={styles.audienceBadge}>
          <Text style={styles.audienceBadgeText}>{audience.toUpperCase()}</Text>
        </View>

        <View style={styles.moderationBarSpacer} />

        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(post.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>

      {/* Reuse the Feed PostCard for consistent post rendering */}
      <PostCard
        post={post}
        onPress={() => onToggleSelect(post.id)}
        isAdmin
        onDelete={() => onDelete(post.id)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AdminPostsModerationScreen({ navigation }: Props) {
  const { profile, loading: profileLoading } = useMyProfile();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Filters
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("none");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const isAdmin = profile?.role === "admin";

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchFeedPosts();
      setPosts(data);
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Apply filters client-side
  const filtered = useMemo(() => {
    let result = posts;

    // Audience filter
    if (audienceFilter !== "all") {
      result = result.filter((p) => (p.audience ?? "all") === audienceFilter);
    }

    // Time filter
    const timeOption = TIME_OPTIONS.find((t) => t.value === timeFilter);
    if (timeOption?.hours != null) {
      const cutoff = Date.now() - timeOption.hours * 60 * 60 * 1000;
      result = result.filter((p) => new Date(p.created_at).getTime() >= cutoff);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const authorName =
          (p.profiles as { full_name: string | null })?.full_name ?? "";
        return (
          authorName.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [posts, audienceFilter, timeFilter, search]);

  // IDs of currently visible posts
  const filteredIds = useMemo(
    () => new Set(filtered.map((p) => p.id)),
    [filtered],
  );

  // Only count selected items that are currently visible
  const visibleSelectedCount = useMemo(
    () => [...selectedIds].filter((id) => filteredIds.has(id)).length,
    [selectedIds, filteredIds],
  );

  const allVisibleSelected =
    filtered.length > 0 && visibleSelectedCount === filtered.length;

  // --- Handlers ---

  const handleToggleSelect = useCallback((postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) {
          next.delete(id);
        }
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) {
          next.add(id);
        }
        return next;
      });
    }
  }, [allVisibleSelected, filteredIds]);

  const handleDelete = useCallback(
    (postId: string) => {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post? This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deletePost(postId);
                setPosts((prev) => prev.filter((p) => p.id !== postId));
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(postId);
                  return next;
                });
              } catch (e: unknown) {
                Alert.alert(
                  "Error",
                  e instanceof Error ? e.message : "Failed to delete post",
                );
              }
            },
          },
        ],
      );
    },
    [],
  );

  const handleBulkDelete = useCallback(() => {
    const idsToDelete = [...selectedIds].filter((id) => filteredIds.has(id));
    if (idsToDelete.length === 0) return;

    Alert.alert(
      "Bulk Delete",
      `Delete ${idsToDelete.length} selected post${idsToDelete.length > 1 ? "s" : ""}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            setBulkDeleting(true);
            const failed: string[] = [];
            for (const id of idsToDelete) {
              try {
                await deletePost(id);
              } catch {
                failed.push(id);
              }
            }
            // Remove successfully deleted from state
            const failedSet = new Set(failed);
            setPosts((prev) =>
              prev.filter((p) => failedSet.has(p.id) || !idsToDelete.includes(p.id)),
            );
            setSelectedIds(new Set(failed));
            setBulkDeleting(false);

            if (failed.length > 0) {
              Alert.alert(
                "Partial Failure",
                `${idsToDelete.length - failed.length} deleted, ${failed.length} failed. Failed posts remain selected.`,
              );
            }
          },
        },
      ],
    );
  }, [selectedIds, filteredIds]);

  // --- Render ---

  if (profileLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Not Authorized</Text>
        <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by author or content..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Audience filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Audience</Text>
        <View style={styles.chipRow}>
          {AUDIENCE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={audienceFilter === opt.value}
              onPress={() => setAudienceFilter(opt.value)}
            />
          ))}
        </View>
      </View>

      {/* Time filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Posted within</Text>
        <View style={styles.chipRow}>
          {TIME_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={timeFilter === opt.value}
              onPress={() => setTimeFilter(opt.value)}
            />
          ))}
        </View>
      </View>

      {/* Selection toolbar */}
      <View style={styles.toolbar}>
        <Pressable
          style={styles.selectAllButton}
          onPress={handleSelectAllVisible}
          disabled={filtered.length === 0}
        >
          <View style={[styles.checkbox, styles.checkboxSmall, allVisibleSelected && styles.checkboxChecked]}>
            {allVisibleSelected && <Text style={styles.checkmarkSmall}>✓</Text>}
          </View>
          <Text style={styles.selectAllText}>
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </Text>
        </Pressable>

        <Text style={styles.countText}>
          {visibleSelectedCount > 0
            ? `${visibleSelectedCount} selected`
            : `${filtered.length} post${filtered.length !== 1 ? "s" : ""}`}
        </Text>

        {visibleSelectedCount > 0 && (
          <Pressable
            style={[styles.bulkDeleteButton, bulkDeleting && styles.bulkDeleteDisabled]}
            onPress={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              <ActivityIndicator size="small" color="#b91c1c" />
            ) : (
              <Text style={styles.bulkDeleteText}>
                Delete ({visibleSelectedCount})
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Post list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        renderItem={({ item }) => (
          <ModerationPostItem
            post={item}
            selected={selectedIds.has(item.id)}
            onToggleSelect={handleToggleSelect}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {search.trim() || audienceFilter !== "all" || timeFilter !== "none"
                ? "No posts match current filters"
                : "No posts found"}
            </Text>
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
    paddingBottom: 4,
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

  // Filters
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  chipText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
  },
  countText: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    color: "#888",
  },
  bulkDeleteButton: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#fca5a5",
    minWidth: 80,
    alignItems: "center",
  },
  bulkDeleteDisabled: {
    opacity: 0.6,
  },
  bulkDeleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#b91c1c",
  },

  // List
  list: { paddingBottom: 16 },

  // Moderation item wrapper
  moderationItem: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  moderationItemSelected: {
    borderColor: "#007AFF",
    borderWidth: 1.5,
    backgroundColor: "#f0f7ff",
  },
  moderationBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: "#f8f9fb",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  moderationBarSpacer: { flex: 1 },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  checkboxSmall: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  checkmarkSmall: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
  },

  audienceBadge: {
    backgroundColor: "#e8f0fe",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#b3d1ff",
  },
  audienceBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1a56db",
    letterSpacing: 0.5,
  },
  deleteButton: {
    backgroundColor: "#fde8e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b91c1c",
  },
});
