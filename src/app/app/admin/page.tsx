"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";

interface ProfileJoin {
  full_name: string | null;
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
  attachments: Attachment[];
  reactionCounts: ReactionCounts;
  userReactions: Emoji[];
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
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

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);

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
      .select("id, author_id, content, audience, created_at, profiles(full_name)")
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
        attachments: attachmentsByPost[row.id] ?? [],
        reactionCounts,
        userReactions,
      };
    });

    setPosts(allPosts);
  }

  async function fetchUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, is_disabled, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    // Fetch emails from auth.users via RPC or just show without email for MVP
    // Since we can't access auth.users directly, we'll show profiles without email
    setUsers(
      (data ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: null,
        is_disabled: p.is_disabled ?? false,
        created_at: p.created_at,
      }))
    );
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

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

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
      alert("Failed to delete post");
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));
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

        {filteredPosts.length === 0 ? (
          <p className="text-gray-500">No posts found for selected filters.</p>
        ) : (
          <ul className="space-y-4">
            {filteredPosts.map((post) => (
              <li key={post.id}>
                <PostCard
                  postId={post.id}
                  content={post.content}
                  audience={post.audience}
                  authorName={post.author_name}
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
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Users Section */}
      <section>
        <h2 className="text-xl font-medium mb-4">Users Management</h2>

        {users.length === 0 ? (
          <p className="text-gray-500">No users found.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link
                        href={`/app/profile/${user.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {user.full_name ?? "No name"}
                      </Link>
                    </td>
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
