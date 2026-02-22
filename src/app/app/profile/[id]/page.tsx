"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/src/lib/supabaseClient";
import { useAvatarUrls } from "@/src/lib/avatarUrl";
import Avatar from "@/src/components/Avatar";
import PostCard, { Attachment, Emoji, ReactionCounts } from "@/src/components/PostCard";
import { signPostAttachments } from "@/src/lib/signPostAttachments";

interface Profile {
  id: string;
  full_name: string | null;
  program: string | null;
  grad_year: number | null;
  role: string | null;
  avatar_path: string | null;
  headline: string | null;
  skills: string[];
}

interface PostRow {
  id: string;
  author_id: string;
  content: string;
  audience: string;
  created_at: string;
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
  content: string;
  audience: string;
  created_at: string;
  attachments: Attachment[];
  reactionCounts: ReactionCounts;
  userReactions: Emoji[];
}

const PAGE_SIZE = 20;

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const { getAvatarUrl } = useAvatarUrls();

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Get current user session and check admin role
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);

        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (currentProfile?.role === "admin") {
          setIsAdmin(true);
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, program, grad_year, role, avatar_path, headline, skills")
        .eq("id", id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const profileData: Profile = { ...data, skills: data.skills ?? [] };
      setProfile(profileData);

      // Generate signed URL for avatar (private bucket) via cached helper
      if (profileData.avatar_path) {
        const url = await getAvatarUrl(profileData.avatar_path);
        if (url) setAvatarSignedUrl(url);
      }

      // Fetch posts by this author
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, author_id, content, audience, created_at")
        .eq("author_id", id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const rows = (postsData ?? []) as PostRow[];
      setHasMore(rows.length === PAGE_SIZE);
      const postIds = rows.map((r) => r.id);

      // Fetch attachments for all posts and batch-sign media URLs
      let attachmentsByPost: Record<string, Attachment[]> = {};
      if (postIds.length > 0) {
        const { data: attachData } = await supabase
          .from("post_attachments")
          .select("id, post_id, type, storage_path, url")
          .in("post_id", postIds);

        attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);
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

      setPosts(
        rows.map((row) => {
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
            content: row.content,
            audience: row.audience,
            created_at: row.created_at,
            attachments: attachmentsByPost[row.id] ?? [],
            reactionCounts,
            userReactions,
          };
        })
      );

      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function loadMorePosts() {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);

    const cursor = posts[posts.length - 1].created_at;

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, author_id, content, audience, created_at")
      .eq("author_id", id)
      .lt("created_at", cursor)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    const rows = (postsData ?? []) as PostRow[];
    setHasMore(rows.length === PAGE_SIZE);

    if (rows.length > 0) {
      const postIds = rows.map((r) => r.id);

      // Fetch attachments
      let attachmentsByPost: Record<string, Attachment[]> = {};
      const { data: attachData } = await supabase
        .from("post_attachments")
        .select("id, post_id, type, storage_path, url")
        .in("post_id", postIds);
      attachmentsByPost = await signPostAttachments((attachData ?? []) as AttachmentRow[]);

      // Fetch reactions
      const reactionsByPost: Record<string, ReactionRow[]> = {};
      const { data: reactionsData } = await supabase
        .from("post_reactions")
        .select("post_id, user_id, emoji")
        .in("post_id", postIds);
      const reactionRows = (reactionsData ?? []) as ReactionRow[];
      for (const r of reactionRows) {
        if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = [];
        reactionsByPost[r.post_id].push(r);
      }

      const newPosts: Post[] = rows.map((row) => {
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
          content: row.content,
          audience: row.audience,
          created_at: row.created_at,
          attachments: attachmentsByPost[row.id] ?? [],
          reactionCounts,
          userReactions,
        };
      });

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
    }

    setLoadingMore(false);
  }

  // canDelete: user is viewing their own profile OR user is admin
  const canDeletePosts = currentUserId === id || isAdmin;

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

  async function handleMessage() {
    if (!currentUserId || currentUserId === id) return;

    setMessagingLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_conversation_1to1", {
        other_user_id: id,
      });

      if (error) {
        console.error("Error creating conversation:", error.message);
        alert("Failed to start conversation");
        return;
      }

      router.push(`/app/messages?c=${data}`);
    } finally {
      setMessagingLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-gray-50/50 dark:bg-slate-900">
        <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-5 md:px-8">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/app/directory"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Directory
            </Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 py-16 md:px-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Profile not found</p>
          <Link
            href="/app/directory"
            className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Browse Directory
          </Link>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === id;

  return (
    <main className="min-h-screen bg-gray-50/50 dark:bg-slate-900">
      {/* Page Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-4 md:px-8 md:py-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/app/directory"
                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {profile?.full_name || "Member Profile"}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 ml-8">View member profile and posts</p>
          </div>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <Link
                href="/app/me"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Profile
              </Link>
            )}
            {currentUserId && !isOwnProfile && (
              <button
                onClick={handleMessage}
                disabled={messagingLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2 text-sm font-medium hover:bg-slate-700 transition disabled:opacity-50"
              >
                {messagingLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Message
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: 2-column layout */}
      <div className="max-w-5xl mx-auto px-6 py-6 md:px-8 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

          {/* Left Column: Profile Summary Card */}
          <div className="space-y-6">
            {/* Profile Identity Card */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <Avatar
                  fullName={profile?.full_name || "?"}
                  avatarUrl={avatarSignedUrl}
                  size="xl"
                />
              </div>

              {/* Name & Headline */}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-4">
                {profile?.full_name || "Unnamed Member"}
              </h2>
              {profile?.headline && (
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{profile.headline}</p>
              )}

              {/* Role Badge */}
              {profile?.role && (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 text-xs font-medium capitalize">
                    {profile.role}
                  </span>
                </div>
              )}

              {/* Quick Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                {profile?.program && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>{profile.program}</span>
                  </div>
                )}
                {profile?.grad_year && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                    <svg className="w-4 h-4 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Class of {profile.grad_year}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Card */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Info Cards + Posts */}
          <div className="space-y-6">
            {/* Basic Information Card */}
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-1 h-5 bg-slate-800 dark:bg-slate-400 rounded-full" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.full_name || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Role</p>
                  {profile?.role ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium capitalize">
                      {profile.role}
                    </span>
                  ) : (
                    <p className="text-sm text-gray-900 dark:text-white">Not specified</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Program</p>
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.program || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Graduation Year</p>
                  <p className="text-sm text-gray-900 dark:text-white">{profile?.grad_year || "Not specified"}</p>
                </div>
              </div>
            </div>

            {/* About Card */}
            {profile?.headline && (
              <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full" />
                  About
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                  {profile.headline}
                </p>
              </div>
            )}

            {/* Posts Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full" />
                  Posts
                  {posts.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 dark:text-slate-500 ml-1">{posts.length}</span>
                  )}
                </h3>
                <Link
                  href="/app/feed/new"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Post
                </Link>
              </div>
              {posts.length === 0 ? (
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center py-8">
                  <svg className="w-12 h-12 text-gray-200 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-1">No posts published</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-4 max-w-xs mx-auto">
                    Share your thoughts, projects, or insights with the community.
                  </p>
                  <Link
                    href="/app/feed/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create First Post
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        postId={post.id}
                        content={post.content}
                        audience={post.audience}
                        createdAt={post.created_at}
                        attachments={post.attachments}
                        canDelete={canDeletePosts}
                        onDelete={() => handleDelete(post.id)}
                        reactionCounts={post.reactionCounts}
                        userReactions={post.userReactions}
                        onReactionToggle={(emoji) => handleReactionToggle(post.id, emoji)}
                        currentUserId={currentUserId}
                        isAdmin={isAdmin}
                        mediaSize="profile"
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="pt-4 text-center">
                      <button
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 transition disabled:opacity-50"
                      >
                        {loadingMore && (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {loadingMore ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
