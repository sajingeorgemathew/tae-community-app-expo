"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";

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
  is_disabled: boolean;
  created_at: string;
}

type AudienceFilter = "all" | "students" | "alumni";
type TimeFilter = "1h" | "2h" | "3h" | "24h";

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

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [bulkDisabling, setBulkDisabling] = useState(false);
  const [deletingUserPosts, setDeletingUserPosts] = useState(false);

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
      await Promise.all([fetchPosts(session.user.id), fetchUsers()]);
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
      .limit(100);

    if (error) {
      console.error("Error fetching posts:", error.message);
      return;
    }

    const rows = (data ?? []) as PostRow[];
    const postIds = rows.map((r) => r.id);

    // Fetch attachments
    const attachmentsByPost: Record<string, Attachment[]> = {};
    if (postIds.length > 0) {
      const { data: attachData } = await supabase
        .from("post_attachments")
        .select("id, post_id, type, storage_path, url")
        .in("post_id", postIds);

      const attachRows = (attachData ?? []) as AttachmentRow[];

      for (const att of attachRows) {
        let attachment: Attachment;

        if (att.type === "link") {
          attachment = { id: att.id, type: "link", linkUrl: att.url ?? undefined };
        } else if (att.storage_path) {
          const { data: signedData } = await supabase.storage
            .from("post-media")
            .createSignedUrl(att.storage_path, 3600);
          attachment = {
            id: att.id,
            type: att.type,
            signedUrl: signedData?.signedUrl,
          };
        } else {
          continue;
        }

        if (!attachmentsByPost[att.post_id]) {
          attachmentsByPost[att.post_id] = [];
        }
        attachmentsByPost[att.post_id].push(attachment);
      }
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
      .select("id, full_name, avatar_path, program, grad_year, role, is_disabled, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    const userRows = (data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_path: p.avatar_path ?? null,
      program: p.program,
      grad_year: p.grad_year,
      role: p.role,
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-semibold mb-4">Not Authorized</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access this page.
          </p>
          <Link href="/app" className="text-blue-600 hover:underline">
            &larr; Back to App
          </Link>
        </div>
      </main>
    );
  }

  const allPostsSelected = filteredPosts.length > 0 && filteredPosts.every((p) => selectedPosts.has(p.id));
  const allUsersSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUsers.has(u.id));

  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-8">Admin Dashboard</h1>

      {/* Posts Section */}
      <section className="mb-12">
        <h2 className="text-xl font-medium mb-4">Posts Moderation</h2>

        <div className="mb-4 flex flex-wrap gap-4">
          {/* Audience filter */}
          <div className="flex gap-2">
            <span className="text-sm text-gray-600 self-center">Audience:</span>
            {(["all", "students", "alumni"] as AudienceFilter[]).map((option) => (
              <button
                key={option}
                onClick={() => setAudienceFilter(option)}
                className={`px-3 py-1 rounded text-sm capitalize ${
                  audienceFilter === option
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Time filter */}
          <div className="flex gap-2">
            <span className="text-sm text-gray-600 self-center">Time:</span>
            {TIME_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeFilter(option.value)}
                className={`px-3 py-1 rounded text-sm ${
                  timeFilter === option.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions for posts */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allPostsSelected}
              onChange={toggleAllPostsSelection}
              className="w-4 h-4"
            />
            Select all visible
          </label>
          <span className="text-sm text-gray-500">
            ({selectedPosts.size} selected)
          </span>
          <button
            onClick={handleBulkDeletePosts}
            disabled={selectedPosts.size === 0 || bulkDeleting}
            className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDeleting ? "Deleting..." : "Delete Selected Posts"}
          </button>
        </div>

        {filteredPosts.length === 0 ? (
          <p className="text-gray-500">No posts found for selected filters.</p>
        ) : (
          <ul className="space-y-4">
            {filteredPosts.map((post) => (
              <li key={post.id} className="flex gap-3 items-start">
                <input
                  type="checkbox"
                  checked={selectedPosts.has(post.id)}
                  onChange={() => togglePostSelection(post.id)}
                  className="w-4 h-4 mt-4 flex-shrink-0"
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
        )}
      </section>

      {/* Users Section */}
      <section>
        <h2 className="text-xl font-medium mb-4">Users Management</h2>

        {/* User search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, program, grad year, or role..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full max-w-md px-3 py-2 border rounded text-sm"
          />
        </div>

        {/* Bulk actions for users */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allUsersSelected}
              onChange={toggleAllUsersSelection}
              className="w-4 h-4"
            />
            Select all visible
          </label>
          <span className="text-sm text-gray-500">
            ({selectedUsers.size} selected)
          </span>
          <button
            onClick={handleBulkDisableUsers}
            disabled={selectedUsers.size === 0 || bulkDisabling}
            className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkDisabling ? "Disabling..." : "Disable Selected Users"}
          </button>
          <button
            onClick={handleDeletePostsBySelectedUsers}
            disabled={selectedUsers.size === 0 || deletingUserPosts}
            className="px-3 py-1 rounded text-sm bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingUserPosts ? "Deleting..." : `Delete Their Posts (${TIME_FILTER_OPTIONS.find(t => t.value === timeFilter)?.label})`}
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="border rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allUsersSelected}
                      onChange={toggleAllUsersSelection}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Program</th>
                  <th className="text-left px-4 py-2">Grad Year</th>
                  <th className="text-left px-4 py-2">Role</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          fullName={user.full_name ?? "?"}
                          avatarUrl={avatarUrls[user.id]}
                          size="sm"
                        />
                        <Link
                          href={`/app/profile/${user.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {user.full_name ?? "No name"}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-2">{user.program ?? "-"}</td>
                    <td className="px-4 py-2">{user.grad_year ?? "-"}</td>
                    <td className="px-4 py-2">{user.role ?? "member"}</td>
                    <td className="px-4 py-2">
                      {user.is_disabled ? (
                        <span className="text-red-600 font-medium">Disabled</span>
                      ) : (
                        <span className="text-green-600">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleToggleDisabled(user.id, user.is_disabled)}
                          disabled={togglingUser === user.id}
                          className={`px-3 py-1 rounded text-sm ${
                            user.is_disabled
                              ? "bg-green-600 text-white hover:bg-green-700"
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
        )}
      </section>
    </main>
  );
}
