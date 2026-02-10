"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import PostCard, { Attachment, Emoji, EMOJI_SET, ReactionCounts } from "@/src/components/PostCard";

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
  author_avatar_url: string | null;
  attachments: Attachment[];
  reactionCounts: ReactionCounts;
  userReactions: Emoji[];
}

type AudienceFilter = "all" | "students" | "alumni";

// Helper: simple hash function for seed string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Helper: seeded shuffle (Fisher-Yates with seeded LCG)
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let state = hashString(seed);

  // Simple LCG for pseudo-random numbers
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AudienceFilter>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { resolveAvatarUrls } = useAvatarUrls();

  useEffect(() => {
    async function fetchData() {
      // Get current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);

        // Fetch user profile to check admin role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }
      }

      // Calculate 5-day cutoff for feed
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch posts within 5-day window
      const { data, error } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
        .gte("created_at", fiveDaysAgo)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching posts:", error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as PostRow[];
      const postIds = rows.map((r) => r.id);

      // Fetch attachments for all posts
      const attachmentsByPost: Record<string, Attachment[]> = {};
      if (postIds.length > 0) {
        const { data: attachData } = await supabase
          .from("post_attachments")
          .select("id, post_id, type, storage_path, url")
          .in("post_id", postIds);

        const attachRows = (attachData ?? []) as AttachmentRow[];

        // Generate signed URLs for image/video attachments
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

      // Fetch reactions for all posts
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

      // Collect unique author avatar paths for signing
      const authorAvatars: { id: string; avatar_path: string | null }[] = [];
      const seenAuthors = new Set<string>();
      for (const row of rows) {
        if (!seenAuthors.has(row.author_id)) {
          seenAuthors.add(row.author_id);
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          authorAvatars.push({ id: row.author_id, avatar_path: profile?.avatar_path ?? null });
        }
      }
      const avatarUrlMap = await resolveAvatarUrls(authorAvatars);

      // Map rows to Post objects
      const allPosts: Post[] = rows.map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const postReactions = reactionsByPost[row.id] ?? [];

        // Compute counts
        const reactionCounts: ReactionCounts = {};
        for (const r of postReactions) {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
        }

        // Get current user's reactions
        const userReactions = postReactions
          .filter((r) => r.user_id === session?.user.id)
          .map((r) => r.emoji as Emoji);

        return {
          id: row.id,
          author_id: row.author_id,
          content: row.content,
          audience: row.audience,
          created_at: row.created_at,
          author_name: profile?.full_name ?? "Unknown Author",
          author_avatar_url: avatarUrlMap[row.author_id] ?? null,
          attachments: attachmentsByPost[row.id] ?? [],
          reactionCounts,
          userReactions,
        };
      });

      // Apply feed ranking: Fresh (< 24h) newest-first, Recent (1-5 days) shuffled daily
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const fresh: Post[] = [];
      const recent: Post[] = [];

      for (const post of allPosts) {
        const postTime = new Date(post.created_at).getTime();
        if (postTime >= twentyFourHoursAgo) {
          fresh.push(post);
        } else {
          recent.push(post);
        }
      }

      // Fresh posts are already sorted newest-first from the query
      // Shuffle recent posts deterministically per-day per-user
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const userId = session?.user.id ?? "anonymous";
      const seed = `${today}:${userId}`;
      const shuffledRecent = seededShuffle(recent, seed);

      setPosts([...fresh, ...shuffledRecent]);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filteredPosts =
    filter === "all"
      ? posts
      : posts.filter((post) => post.audience === filter || post.audience === "all");

  function canDelete(post: Post): boolean {
    if (!currentUserId) return false;
    return post.author_id === currentUserId || isAdmin;
  }

  async function handleDelete(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    // Fetch attachments to get storage paths for cleanup
    const { data: attachments } = await supabase
      .from("post_attachments")
      .select("storage_path, type")
      .eq("post_id", postId);

    // Delete storage objects for image/video attachments
    const storagePaths = (attachments ?? [])
      .filter((a) => (a.type === "image" || a.type === "video") && a.storage_path)
      .map((a) => a.storage_path as string);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-media")
        .remove(storagePaths);

      if (storageError) {
        console.error("Error deleting storage objects:", storageError.message);
        // Continue with post deletion even if storage cleanup fails
      }
    }

    // Delete the post (cascades to post_attachments rows)
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
      // Remove reaction
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
      // Add reaction
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Feed</h1>
        <Link
          href="/app/feed/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          New Post
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        {(["all", "students", "alumni"] as AudienceFilter[]).map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`px-3 py-1 rounded text-sm capitalize ${
              filter === option
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-gray-500">
          {posts.length === 0 ? "No posts yet." : "No posts for this filter."}
        </p>
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
                authorAvatarUrl={post.author_avatar_url}
                createdAt={post.created_at}
                attachments={post.attachments}
                canDelete={canDelete(post)}
                onDelete={() => handleDelete(post.id)}
                reactionCounts={post.reactionCounts}
                userReactions={post.userReactions}
                onReactionToggle={(emoji) => handleReactionToggle(post.id, emoji)}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                mediaSize="feed"
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
