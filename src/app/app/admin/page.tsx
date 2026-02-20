"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";
import { signPostAttachments } from "@/src/lib/signPostAttachments";

interface ProfileJoin {
  full_name: string | null;
  avatar_path: string | null;
}

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
  profiles: ProfileJoin | ProfileJoin[] | null;
}

interface AttachmentRow {
  id: string;
  post_id: string;
  type: "image" | "video" | "link";
  storage_path: string | null;
  url: string | null;
}

interface ReactionRow {
  post_id: string;
  user_id: string;
  emoji: string;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
  author_name: string;
  author_avatar_path: string | null;
  attachments: Attachment[];
  reactionCounts: ReactionCounts;
  userReactions: Emoji[];
}

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
  is_listed_as_tutor: boolean;
  is_disabled: boolean;
  created_at: string;
}

interface TutorEdit {
  role: string;
  is_listed_as_tutor: boolean;
}

interface Course {
  id: string;
  code: string;
  title: string;
}

type AudienceFilter = "all" | "students" | "alumni";
type TimeFilter = "1h" | "2h" | "3h" | "24h";

const PAGE_SIZE = 20;
const USER_PAGE_SIZE = 25;

const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string; hours: number }[] = [
  { value: "1h", label: "Last 1 hour", hours: 1 },
  { value: "2h", label: "Last 2 hours", hours: 2 },
  { value: "3h", label: "Last 3 hours", hours: 3 },
  { value: "24h", label: "Last 24 hours", hours: 24 },
];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [bulkDisabling, setBulkDisabling] = useState(false);
  const [deletingUserPosts, setDeletingUserPosts] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);

  // Tutor management state
  const [tutorSearch, setTutorSearch] = useState("");
  const [tutorEdits, setTutorEdits] = useState<Record<string, TutorEdit>>({});
  const [savingTutor, setSavingTutor] = useState<string | null>(null);
  const [tutorSaveStatus, setTutorSaveStatus] = useState<Record<string, { type: "success" | "error"; message: string }>>({});

  // Course assignment state
  const [courses, setCourses] = useState<Course[]>([]);
  const [tutorAssignments, setTutorAssignments] = useState<Record<string, string[]>>({}); // tutor_id -> course_id[]
  const [tutorCourseEdits, setTutorCourseEdits] = useState<Record<string, string[]>>({}); // tutor_id -> selected course_id[]
  const [savingCourses, setSavingCourses] = useState<string | null>(null);
  const [courseSaveStatus, setCourseSaveStatus] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
  const [courseDropdownOpen, setCourseDropdownOpen] = useState<string | null>(null);

  // Avatar signed URL cache + resolver
  const { resolveAvatarUrls } = useAvatarUrls();
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin") {
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchPosts(session.user.id), fetchUsers(), fetchCourses(), fetchTutorAssignments()]);
      setLoading(false);
    }

    init();
  }, []);

  async function fetchPosts(userId: string) {
    const timeOption = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter);
    const cutoff = new Date(Date.now() - (timeOption?.hours ?? 24) * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("Error fetching posts:", error.message);
      return;
    }

    const rows = (data ?? []) as PostRow[];
    setHasMorePosts(rows.length === PAGE_SIZE);
    const postIds = rows.map((r) => r.id);

    // Fetch attachments and batch-sign media URLs
    let attachmentsByPost: Record<string, Attachment[]> = {};
    if (postIds.length > 0) {
      const { data: attachData } = await supabase
        .from("post_attachments")
        .select("id, post_id, type, storage_path, url")
        .in("post_id", postIds);

      attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);
    }

    // Fetch reactions
    const reactionsByPost: Record<string, ReactionRow[]> = {};
    if (postIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, emoji")
        .in("post_id", postIds);

      const reactionRows = (reactionsData ?? []) as ReactionRow[];
      for (const r of reactionRows) {
        if (!reactionsByPost[r.post_id]) {
          reactionsByPost[r.post_id] = [];
        }
        reactionsByPost[r.post_id].push(r);
      }
    }

    // Map to Post objects
    const allPosts: Post[] = rows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const postReactions = reactionsByPost[row.id] ?? [];

      const reactionCounts: ReactionCounts = {};
      for (const r of postReactions) {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
      }

      const userReactions = postReactions
        .filter((r) => r.user_id === userId)
        .map((r) => r.emoji as Emoji);

      return {
        id: row.id,
        author_id: row.author_id,
        content: row.content,
        audience: row.audience,
        created_at: row.created_at,
        author_name: profile?.full_name ?? "Unknown Author",
        author_avatar_path: profile?.avatar_path ?? null,
        attachments: attachmentsByPost[row.id] ?? [],
        reactionCounts,
        userReactions,
      };
    });

    setPosts(allPosts);
    setSelectedPosts(new Set());

    // Resolve avatar URLs for post authors
    const authorProfiles = allPosts
      .filter((p) => p.author_avatar_path)
      .map((p) => ({ id: p.author_id, avatar_path: p.author_avatar_path }));
    if (authorProfiles.length > 0) {
      const urls = await resolveAvatarUrls(authorProfiles);
      setAvatarUrls((prev) => ({ ...prev, ...urls }));
    }
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_path, program, grad_year, role, is_listed_as_tutor, is_disabled, created_at")
      .order("created_at", { ascending: false })
      .limit(USER_PAGE_SIZE);

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    setHasMoreUsers((data ?? []).length === USER_PAGE_SIZE);

    const userRows = (data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_path: p.avatar_path ?? null,
      program: p.program,
      grad_year: p.grad_year,
      role: p.role,
      is_listed_as_tutor: p.is_listed_as_tutor ?? false,
      is_disabled: p.is_disabled ?? false,
      created_at: p.created_at,
    }));

    setUsers(userRows);
    setSelectedUsers(new Set());

    // Resolve avatar URLs for users
    const withAvatars = userRows
      .filter((u) => u.avatar_path)
      .map((u) => ({ id: u.id, avatar_path: u.avatar_path }));
    if (withAvatars.length > 0) {
      const urls = await resolveAvatarUrls(withAvatars);
      setAvatarUrls((prev) => ({ ...prev, ...urls }));
    }
  }

  async function loadMorePosts() {
    if (!currentUserId || loadingMorePosts || !hasMorePosts || posts.length === 0) return;

    setLoadingMorePosts(true);

    const cursor = posts[posts.length - 1].created_at;
    const timeOption = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter);
    const cutoff = new Date(Date.now() - (timeOption?.hours ?? 24) * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
      .gte("created_at", cutoff)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("Error loading more posts:", error.message);
      setLoadingMorePosts(false);
      return;
    }

    const rows = (data ?? []) as PostRow[];
    setHasMorePosts(rows.length === PAGE_SIZE);

    if (rows.length === 0) {
      setLoadingMorePosts(false);
      return;
    }

    const existingIds = new Set(posts.map((p) => p.id));
    const newRows = rows.filter((r) => !existingIds.has(r.id));

    if (newRows.length === 0) {
      setLoadingMorePosts(false);
      return;
    }

    const postIds = newRows.map((r) => r.id);

    // Fetch attachments and batch-sign media URLs
    let attachmentsByPost: Record<string, Attachment[]> = {};
    if (postIds.length > 0) {
      const { data: attachData } = await supabase
        .from("post_attachments")
        .select("id, post_id, type, storage_path, url")
        .in("post_id", postIds);

      attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);
    }

    // Fetch reactions
    const reactionsByPost: Record<string, ReactionRow[]> = {};
    if (postIds.length > 0) {
      const { data: reactionsData } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, emoji")
        .in("post_id", postIds);

      const reactionRows = (reactionsData ?? []) as ReactionRow[];
      for (const r of reactionRows) {
        if (!reactionsByPost[r.post_id]) {
          reactionsByPost[r.post_id] = [];
        }
        reactionsByPost[r.post_id].push(r);
      }
    }

    const newPosts: Post[] = newRows.map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const postReactions = reactionsByPost[row.id] ?? [];

      const reactionCounts: ReactionCounts = {};
      for (const r of postReactions) {
        reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
      }

      const userReactions = postReactions
        .filter((r) => r.user_id === currentUserId)
        .map((r) => r.emoji as Emoji);

      return {
        id: row.id,
        author_id: row.author_id,
        content: row.content,
        audience: row.audience,
        created_at: row.created_at,
        author_name: profile?.full_name ?? "Unknown Author",
        author_avatar_path: profile?.avatar_path ?? null,
        attachments: attachmentsByPost[row.id] ?? [],
        reactionCounts,
        userReactions,
      };
    });

    setPosts((prev) => [...prev, ...newPosts]);

    // Resolve avatar URLs for new post authors
    const authorProfiles = newPosts
      .filter((p) => p.author_avatar_path)
      .map((p) => ({ id: p.author_id, avatar_path: p.author_avatar_path }));
    if (authorProfiles.length > 0) {
      const urls = await resolveAvatarUrls(authorProfiles);
      setAvatarUrls((prev) => ({ ...prev, ...urls }));
    }

    setLoadingMorePosts(false);
  }

  async function loadMoreUsers() {
    if (loadingMoreUsers || !hasMoreUsers || users.length === 0) return;

    setLoadingMoreUsers(true);

    const cursor = users[users.length - 1].created_at;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_path, program, grad_year, role, is_listed_as_tutor, is_disabled, created_at")
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(USER_PAGE_SIZE);

    if (error) {
      console.error("Error loading more users:", error.message);
      setLoadingMoreUsers(false);
      return;
    }

    const rows = data ?? [];
    setHasMoreUsers(rows.length === USER_PAGE_SIZE);

    const existingIds = new Set(users.map((u) => u.id));
    const newRows = rows
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_path: p.avatar_path ?? null,
        program: p.program,
        grad_year: p.grad_year,
        role: p.role,
        is_listed_as_tutor: p.is_listed_as_tutor ?? false,
        is_disabled: p.is_disabled ?? false,
        created_at: p.created_at,
      }));

    if (newRows.length === 0) {
      setLoadingMoreUsers(false);
      return;
    }

    setUsers((prev) => [...prev, ...newRows]);

    // Resolve avatar URLs for new users only
    const withAvatars = newRows
      .filter((u) => u.avatar_path)
      .map((u) => ({ id: u.id, avatar_path: u.avatar_path }));
    if (withAvatars.length > 0) {
      const urls = await resolveAvatarUrls(withAvatars);
      setAvatarUrls((prev) => ({ ...prev, ...urls }));
    }

    setLoadingMoreUsers(false);
  }

  async function fetchCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, code, title")
      .eq("is_active", true)
      .order("code", { ascending: true });

    if (error) {
      console.error("Error fetching courses:", error.message);
      return;
    }

    setCourses((data ?? []) as Course[]);
  }

  async function fetchTutorAssignments() {
    const { data, error } = await supabase
      .from("tutor_course_assignments")
      .select("tutor_id, course_id");

    if (error) {
      console.error("Error fetching tutor assignments:", error.message);
      return;
    }

    const assignments: Record<string, string[]> = {};
    for (const row of data ?? []) {
      if (!assignments[row.tutor_id]) {
        assignments[row.tutor_id] = [];
      }
      assignments[row.tutor_id].push(row.course_id);
    }
    setTutorAssignments(assignments);
  }

  // Re-fetch posts when time filter changes
  useEffect(() => {
    if (isAdmin && currentUserId) {
      fetchPosts(currentUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, isAdmin, currentUserId]);

  const filteredPosts =
    audienceFilter === "all"
      ? posts
      : posts.filter((post) => post.audience === audienceFilter);

  // Filter users by search term (client-side)
  const filteredUsers = users.filter((user) => {
    if (!userSearch.trim()) return true;
    const searchLower = userSearch.toLowerCase();
    return (
      (user.full_name?.toLowerCase().includes(searchLower)) ||
      (user.program?.toLowerCase().includes(searchLower)) ||
      (user.grad_year?.toString().includes(searchLower)) ||
      (user.role?.toLowerCase().includes(searchLower))
    );
  });

  // Delete a single post with storage cleanup
  async function deletePostWithCleanup(postId: string): Promise<boolean> {
    // Fetch attachments for storage cleanup
    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("storage_path, type")
      .eq("post_id", postId);

    const storagePaths = (attachments ?? [])
      .filter((a) => (a.type === "image" || a.type === "video") && a.storage_path)
      .map((a) => a.storage_path as string);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-media")
        .remove(storagePaths);

      if (storageError) {
        console.error("Error deleting storage objects:", storageError.message);
      }
    }

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      console.error("Error deleting post:", error.message);
      return false;
    }

    return true;
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    const success = await deletePostWithCleanup(postId);
    if (success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } else {
      alert("Failed to delete post");
    }
  }

  async function handleBulkDeletePosts() {
    if (selectedPosts.size === 0) {
      alert("No posts selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedPosts.size} selected post(s)?`)) {
      return;
    }

    setBulkDeleting(true);
    const postIds = Array.from(selectedPosts);
    const deletedIds: string[] = [];

    for (const postId of postIds) {
      const success = await deletePostWithCleanup(postId);
      if (success) {
        deletedIds.push(postId);
      }
    }

    setPosts((prev) => prev.filter((p) => !deletedIds.includes(p.id)));
    setSelectedPosts(new Set());
    setBulkDeleting(false);

    if (deletedIds.length < postIds.length) {
      alert(`Deleted ${deletedIds.length} of ${postIds.length} posts. Some failed.`);
    }
  }

  async function handleDeletePostsBySelectedUsers() {
    if (selectedUsers.size === 0) {
      alert("No users selected");
      return;
    }

    const timeOption = TIME_FILTER_OPTIONS.find((t) => t.value === timeFilter);
    const timeLabel = timeOption?.label ?? "selected time window";

    if (!confirm(`Delete all posts from ${selectedUsers.size} selected user(s) within ${timeLabel}?`)) {
      return;
    }

    setDeletingUserPosts(true);

    const cutoff = new Date(Date.now() - (timeOption?.hours ?? 24) * 60 * 60 * 1000).toISOString();
    const userIds = Array.from(selectedUsers);

    // Fetch posts by selected users within the time window
    const { data: userPosts, error } = await supabase
      .from("posts")
      .select("id")
      .in("author_id", userIds)
      .gte("created_at", cutoff);

    if (error) {
      console.error("Error fetching user posts:", error.message);
      alert("Failed to fetch posts");
      setDeletingUserPosts(false);
      return;
    }

    const postIds = (userPosts ?? []).map((p) => p.id);
    const deletedIds: string[] = [];

    for (const postId of postIds) {
      const success = await deletePostWithCleanup(postId);
      if (success) {
        deletedIds.push(postId);
      }
    }

    setPosts((prev) => prev.filter((p) => !deletedIds.includes(p.id)));
    setSelectedPosts(new Set());
    setDeletingUserPosts(false);

    alert(`Deleted ${deletedIds.length} post(s) from selected users.`);
  }

  async function handleReactionToggle(postId: string, emoji: Emoji) {
    if (!currentUserId) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hasReacted = post.userReactions.includes(emoji);

    if (hasReacted) {
      const { error } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);

      if (error) {
        console.error("Error removing reaction:", error.message);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactionCounts: {
                  ...p.reactionCounts,
                  [emoji]: (p.reactionCounts[emoji] ?? 1) - 1,
                },
                userReactions: p.userReactions.filter((e) => e !== emoji),
              }
            : p
        )
      );
    } else {
      const { error } = await supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: currentUserId, emoji });

      if (error) {
        console.error("Error adding reaction:", error.message);
        return;
      }

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                reactionCounts: {
                  ...p.reactionCounts,
                  [emoji]: (p.reactionCounts[emoji] ?? 0) + 1,
                },
                userReactions: [...p.userReactions, emoji],
              }
            : p
        )
      );
    }
  }

  async function handleToggleDisabled(userId: string, currentlyDisabled: boolean) {
    setTogglingUser(userId);

    const { error } = await supabase
      .from("profiles")
      .update({ is_disabled: !currentlyDisabled })
      .eq("id", userId);

    if (error) {
      console.error("Error updating user:", error.message);
      alert("Failed to update user status");
      setTogglingUser(null);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_disabled: !currentlyDisabled } : u
      )
    );
    setTogglingUser(null);
  }

  async function handleBulkDisableUsers() {
    if (selectedUsers.size === 0) {
      alert("No users selected");
      return;
    }

    // Filter out current user from bulk disable
    const usersToDisable = Array.from(selectedUsers).filter((id) => id !== currentUserId);

    if (usersToDisable.length === 0) {
      alert("Cannot disable yourself");
      return;
    }

    if (!confirm(`Are you sure you want to disable ${usersToDisable.length} selected user(s)?`)) {
      return;
    }

    setBulkDisabling(true);

    const { error } = await supabase
      .from("profiles")
      .update({ is_disabled: true })
      .in("id", usersToDisable);

    if (error) {
      console.error("Error bulk disabling users:", error.message);
      alert("Failed to disable users");
      setBulkDisabling(false);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        usersToDisable.includes(u.id) ? { ...u, is_disabled: true } : u
      )
    );
    setSelectedUsers(new Set());
    setBulkDisabling(false);
  }

  function togglePostSelection(postId: string) {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }

  function toggleAllPostsSelection() {
    const visiblePostIds = filteredPosts.map((p) => p.id);
    const allSelected = visiblePostIds.every((id) => selectedPosts.has(id));

    if (allSelected) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(visiblePostIds));
    }
  }

  function toggleUserSelection(userId: string) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleAllUsersSelection() {
    const visibleUserIds = filteredUsers.map((u) => u.id);
    const allSelected = visibleUserIds.every((id) => selectedUsers.has(id));

    if (allSelected) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(visibleUserIds));
    }
  }

  // Tutor management helpers
  const filteredTutorUsers = users.filter((user) => {
    if (!tutorSearch.trim()) return true;
    return user.full_name?.toLowerCase().includes(tutorSearch.toLowerCase());
  });

  function getTutorEdit(user: UserProfile): TutorEdit {
    return tutorEdits[user.id] ?? { role: user.role ?? "member", is_listed_as_tutor: user.is_listed_as_tutor };
  }

  function hasTutorChanges(user: UserProfile): boolean {
    const edit = tutorEdits[user.id];
    if (!edit) return false;
    return edit.role !== (user.role ?? "member") || edit.is_listed_as_tutor !== user.is_listed_as_tutor;
  }

  function handleTutorRoleChange(userId: string, newRole: string, user: UserProfile) {
    const current = getTutorEdit(user);
    setTutorEdits((prev) => ({
      ...prev,
      [userId]: {
        role: newRole,
        // If demoting to member, force listing off
        is_listed_as_tutor: newRole === "member" ? false : current.is_listed_as_tutor,
      },
    }));
    // Clear any previous status message
    setTutorSaveStatus((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function handleTutorListingToggle(userId: string, user: UserProfile) {
    const current = getTutorEdit(user);
    setTutorEdits((prev) => ({
      ...prev,
      [userId]: { ...current, is_listed_as_tutor: !current.is_listed_as_tutor },
    }));
    setTutorSaveStatus((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function handleTutorSave(userId: string, user: UserProfile) {
    const edit = getTutorEdit(user);
    if (!hasTutorChanges(user)) return;

    setSavingTutor(userId);
    setTutorSaveStatus((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    // If role is member, ensure listing is false
    const finalListing = edit.role === "member" ? false : edit.is_listed_as_tutor;

    const { error } = await supabase
      .from("profiles")
      .update({ role: edit.role, is_listed_as_tutor: finalListing })
      .eq("id", userId);

    if (error) {
      console.error("Error updating tutor:", error.message);
      setTutorSaveStatus((prev) => ({
        ...prev,
        [userId]: { type: "error", message: error.message },
      }));
      setSavingTutor(null);
      return;
    }

    // Update local state
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: edit.role, is_listed_as_tutor: finalListing } : u
      )
    );
    // Clear edit state for this user
    setTutorEdits((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
    setTutorSaveStatus((prev) => ({
      ...prev,
      [userId]: { type: "success", message: "Saved" },
    }));
    setSavingTutor(null);

    // Auto-clear success message after 3s
    setTimeout(() => {
      setTutorSaveStatus((prev) => {
        if (prev[userId]?.type === "success") {
          const next = { ...prev };
          delete next[userId];
          return next;
        }
        return prev;
      });
    }, 3000);
  }

  // Course assignment helpers
  function getTutorCourses(userId: string): string[] {
    return tutorCourseEdits[userId] ?? tutorAssignments[userId] ?? [];
  }

  function hasCourseChanges(userId: string): boolean {
    const edited = tutorCourseEdits[userId];
    if (!edited) return false;
    const original = tutorAssignments[userId] ?? [];
    if (edited.length !== original.length) return true;
    const sortedEdited = [...edited].sort();
    const sortedOriginal = [...original].sort();
    return sortedEdited.some((id, i) => id !== sortedOriginal[i]);
  }

  function handleCourseToggle(userId: string, courseId: string) {
    const current = getTutorCourses(userId);
    const updated = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    setTutorCourseEdits((prev) => ({ ...prev, [userId]: updated }));
    setCourseSaveStatus((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function handleCourseSave(userId: string) {
    if (!hasCourseChanges(userId)) return;

    setSavingCourses(userId);
    setCourseSaveStatus((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    const selected = getTutorCourses(userId);
    const original = tutorAssignments[userId] ?? [];
    const toAdd = selected.filter((id) => !original.includes(id));
    const toRemove = original.filter((id) => !selected.includes(id));

    try {
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("tutor_course_assignments")
          .upsert(
            toAdd.map((course_id) => ({ tutor_id: userId, course_id })),
            { onConflict: "tutor_id,course_id" }
          );
        if (error) throw error;
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("tutor_course_assignments")
          .delete()
          .eq("tutor_id", userId)
          .in("course_id", toRemove);
        if (error) throw error;
      }

      // Update local state
      setTutorAssignments((prev) => ({ ...prev, [userId]: selected }));
      setTutorCourseEdits((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setCourseSaveStatus((prev) => ({
        ...prev,
        [userId]: { type: "success", message: "Courses saved" },
      }));

      setTimeout(() => {
        setCourseSaveStatus((prev) => {
          if (prev[userId]?.type === "success") {
            const next = { ...prev };
            delete next[userId];
            return next;
          }
          return prev;
        });
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save courses";
      console.error("Error saving course assignments:", message);
      setCourseSaveStatus((prev) => ({
        ...prev,
        [userId]: { type: "error", message },
      }));
    } finally {
      setSavingCourses(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading admin dashboard...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen p-6 md:p-8 bg-gray-50/50 dark:bg-slate-950">
        <div className="max-w-md mx-auto mt-20">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center dark:bg-slate-950 dark:border-slate-700">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4 dark:bg-red-950">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#1e293b] mb-2 dark:text-slate-100">Not Authorized</h1>
            <p className="text-sm text-gray-500 mb-6 dark:text-slate-400">
              You do not have permission to access this page.
            </p>
            <Link href="/app" className="text-sm text-blue-600 hover:underline font-medium dark:text-blue-400">
              &larr; Back to App
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const allPostsSelected = filteredPosts.length > 0 && filteredPosts.every((p) => selectedPosts.has(p.id));
  const allUsersSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUsers.has(u.id));

  return (
    <main className="min-h-screen bg-gray-50/50 p-6 md:p-8 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/app" className="text-sm text-blue-600 hover:underline font-medium">
            &larr; Back to App
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-[#1e293b] mb-8 dark:text-slate-100">Admin Dashboard</h1>

        {/* Posts Section */}
        <section className="mb-8">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-slate-950 dark:border-slate-700">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Posts Moderation</h2>
            </div>

            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-4 mb-4">
                {/* Audience filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider dark:text-slate-500">Audience:</span>
                  <div className="flex gap-1.5">
                    {(["all", "students", "alumni"] as AudienceFilter[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => setAudienceFilter(option)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                          audienceFilter === option
                            ? "bg-slate-800 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider dark:text-slate-500">Time:</span>
                  <div className="flex gap-1.5">
                    {TIME_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTimeFilter(option.value)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          timeFilter === option.value
                            ? "bg-slate-800 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bulk actions for posts */}
              <div className="flex flex-wrap gap-3 items-center py-3 px-4 rounded-lg bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={allPostsSelected}
                    onChange={toggleAllPostsSelection}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  Select all visible
                </label>
                <span className="text-xs text-gray-400 font-medium dark:text-slate-500">
                  ({selectedPosts.size} selected)
                </span>
                <button
                  onClick={handleBulkDeletePosts}
                  disabled={selectedPosts.size === 0 || bulkDeleting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkDeleting ? "Deleting..." : "Delete Selected Posts"}
                </button>
              </div>
            </div>

            <div className="px-6 pb-6">
              {filteredPosts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400 dark:text-slate-500">No posts found for selected filters.</p>
                </div>
              ) : (
                <>
                <ul className="space-y-4">
                  {filteredPosts.map((post) => (
                    <li key={post.id} className="flex gap-3 items-start">
                      <input
                        type="checkbox"
                        checked={selectedPosts.has(post.id)}
                        onChange={() => togglePostSelection(post.id)}
                        className="w-4 h-4 mt-4 flex-shrink-0 rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <PostCard
                          postId={post.id}
                          content={post.content}
                          audience={post.audience}
                          authorName={post.author_name}
                          authorAvatarUrl={avatarUrls[post.author_id]}
                          authorId={post.author_id}
                          createdAt={post.created_at}
                          attachments={post.attachments}
                          canDelete={true}
                          onDelete={() => handleDelete(post.id)}
                          reactionCounts={post.reactionCounts}
                          userReactions={post.userReactions}
                          onReactionToggle={(emoji) => handleReactionToggle(post.id, emoji)}
                          currentUserId={currentUserId}
                          isAdmin={true}
                          mediaSize="feed"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {hasMorePosts && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMorePosts}
                      disabled={loadingMorePosts}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingMorePosts ? "Loading..." : "Load more posts"}
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        </section>

      {/* Tutors Section */}
      <section className="mb-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Tutors</h2>
          </div>

          <div className="px-6 py-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={tutorSearch}
              onChange={(e) => setTutorSearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-400 dark:focus:ring-slate-400/30"
            />
          </div>

          <div className="px-6 pb-6">
            {filteredTutorUsers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-slate-500">No users found.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden overflow-x-auto dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Program</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Grad Year</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Listed</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Courses</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredTutorUsers.map((user) => {
                      const edit = getTutorEdit(user);
                      const changed = hasTutorChanges(user);
                      const isSelf = user.id === currentUserId;
                      const isAdminRole = (user.role ?? "member") === "admin";
                      const status = tutorSaveStatus[user.id];
                      const effectiveRole = edit.role;
                      const isTutor = effectiveRole === "tutor";
                      const selectedCourses = getTutorCourses(user.id);
                      const courseChanged = hasCourseChanges(user.id);
                      const cStatus = courseSaveStatus[user.id];

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors dark:hover:bg-slate-900/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar
                                fullName={user.full_name ?? "?"}
                                avatarUrl={avatarUrls[user.id]}
                                size="sm"
                              />
                              <span className="font-medium text-gray-900 dark:text-slate-100">{user.full_name ?? "No name"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{user.program ?? "-"}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{user.grad_year ?? "-"}</td>
                          <td className="px-4 py-3">
                            {isSelf || isAdminRole ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-medium capitalize dark:bg-slate-800 dark:text-slate-300">{user.role ?? "member"}</span>
                            ) : (
                              <select
                                value={edit.role}
                                onChange={(e) => handleTutorRoleChange(user.id, e.target.value, user)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:focus:border-slate-400 dark:focus:ring-slate-400/30"
                              >
                                <option value="member">member</option>
                                <option value="tutor">tutor</option>
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelf || isAdminRole ? (
                              <span className="text-gray-400 dark:text-slate-600">-</span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={edit.is_listed_as_tutor}
                                disabled={edit.role !== "tutor"}
                                onChange={() => handleTutorListingToggle(user.id, user)}
                                className="w-4 h-4 rounded border-gray-300"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isSelf || isAdminRole ? (
                              <span className="text-gray-400 dark:text-slate-600">-</span>
                            ) : !isTutor ? (
                              <span className="text-xs text-gray-400 italic dark:text-slate-500">Promote to tutor to assign courses</span>
                            ) : (
                              <div className="flex flex-col gap-1.5">
                                <div className="relative">
                                  <button
                                    onClick={() => setCourseDropdownOpen(courseDropdownOpen === user.id ? null : user.id)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-left min-w-[160px] bg-white hover:bg-gray-50 transition-colors dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    {selectedCourses.length === 0
                                      ? "Select courses..."
                                      : `${selectedCourses.length} course${selectedCourses.length > 1 ? "s" : ""} selected`}
                                  </button>
                                  {courseDropdownOpen === user.id && (
                                    <CourseDropdown
                                      courses={courses}
                                      selected={selectedCourses}
                                      onToggle={(courseId) => handleCourseToggle(user.id, courseId)}
                                      onClose={() => setCourseDropdownOpen(null)}
                                    />
                                  )}
                                </div>
                                {selectedCourses.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {selectedCourses.map((cid) => {
                                      const c = courses.find((co) => co.id === cid);
                                      return c ? (
                                        <span key={cid} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                          {c.code}
                                          <button
                                            onClick={() => handleCourseToggle(user.id, cid)}
                                            className="hover:text-blue-900 transition-colors"
                                          >
                                            x
                                          </button>
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                                {courseChanged && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleCourseSave(user.id)}
                                      disabled={savingCourses === user.id}
                                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                      {savingCourses === user.id ? "Saving..." : "Save Courses"}
                                    </button>
                                  </div>
                                )}
                                {cStatus && (
                                  <span className={`text-xs font-medium ${cStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
                                    {cStatus.message}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {!isSelf && !isAdminRole && (
                                <button
                                  onClick={() => handleTutorSave(user.id, user)}
                                  disabled={!changed || savingTutor === user.id}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {savingTutor === user.id ? "Saving..." : "Save"}
                                </button>
                              )}
                              {status && (
                                <span
                                  className={`text-xs font-medium ${
                                    status.type === "success" ? "text-emerald-600" : "text-red-600"
                                  }`}
                                >
                                  {status.message}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Users Section */}
      <section className="mb-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Users Management</h2>
          </div>

          <div className="px-6 py-4">
            {/* User search */}
            <input
              type="text"
              placeholder="Search by name, program, grad year, or role..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e293b] focus:ring-1 focus:ring-[#1e293b]/20 transition-colors mb-4"
            />

            {/* Bulk actions for users */}
            <div className="flex flex-wrap gap-3 items-center py-3 px-4 rounded-lg bg-gray-50 border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={allUsersSelected}
                  onChange={toggleAllUsersSelection}
                  className="w-4 h-4 rounded border-gray-300"
                />
                Select all visible
              </label>
              <span className="text-xs text-gray-400 font-medium">
                ({selectedUsers.size} selected)
              </span>
              <button
                onClick={handleBulkDisableUsers}
                disabled={selectedUsers.size === 0 || bulkDisabling}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {bulkDisabling ? "Disabling..." : "Disable Selected Users"}
              </button>
              <button
                onClick={handleDeletePostsBySelectedUsers}
                disabled={selectedUsers.size === 0 || deletingUserPosts}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingUserPosts ? "Deleting..." : `Delete Their Posts (${TIME_FILTER_OPTIONS.find(t => t.value === timeFilter)?.label})`}
              </button>
            </div>
          </div>

          <div className="px-6 pb-6">
            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-slate-500">No users found.</p>
              </div>
            ) : (
              <>
              <div className="rounded-lg border border-gray-200 overflow-hidden overflow-x-auto dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-900">
                    <tr>
                      <th className="text-left px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={allUsersSelected}
                          onChange={toggleAllUsersSelection}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Program</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Grad Year</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar
                              fullName={user.full_name ?? "?"}
                              avatarUrl={avatarUrls[user.id]}
                              size="sm"
                            />
                            <Link
                              href={`/app/profile/${user.id}`}
                              className="text-sm text-blue-600 hover:underline font-medium"
                            >
                              {user.full_name ?? "No name"}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{user.program ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{user.grad_year ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-0.5 text-xs font-medium capitalize dark:bg-slate-800 dark:text-slate-300">
                            {user.role ?? "member"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_disabled ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 text-xs font-medium dark:bg-red-950 dark:text-red-300 dark:border-red-800">Disabled</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {user.id !== currentUserId && (
                            <button
                              onClick={() => handleToggleDisabled(user.id, user.is_disabled)}
                              disabled={togglingUser === user.id}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                user.is_disabled
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                  : "bg-red-600 text-white hover:bg-red-700"
                              } disabled:opacity-50`}
                            >
                              {togglingUser === user.id
                                ? "..."
                                : user.is_disabled
                                ? "Enable"
                                : "Disable"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreUsers && (
                <div className="mt-4 text-center">
                  <button
                    onClick={loadMoreUsers}
                    disabled={loadingMoreUsers}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loadingMoreUsers ? "Loading..." : "Load more users"}
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

function CourseDropdown({
  courses,
  selected,
  onToggle,
  onClose,
}: {
  courses: Course[];
  selected: string[];
  onToggle: (courseId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-10 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto min-w-[220px] dark:bg-slate-900 dark:border-slate-700"
    >
      {courses.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">No courses available</div>
      ) : (
        courses.map((course) => (
          <label
            key={course.id}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors dark:hover:bg-slate-800"
          >
            <input
              type="checkbox"
              checked={selected.includes(course.id)}
              onChange={() => onToggle(course.id)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="font-medium text-gray-900 dark:text-slate-100">{course.code}</span>
            <span className="text-gray-500 dark:text-slate-400">{course.title}</span>
          </label>
        ))
      )}
    </div>
  );
}
