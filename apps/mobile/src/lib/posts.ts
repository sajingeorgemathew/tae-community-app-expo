import type { PostWithAuthor, PostAttachment, PostInsert, PostReaction, PostComment } from "@tae/shared";
import { createSignedUrlsBatch, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "./supabase";

// ---------------------------------------------------------------------------
// Reaction constants & types (aligned with web EMOJI_SET + DB check constraint)
// ---------------------------------------------------------------------------

export const EMOJI_SET = ["\u2764\uFE0F", "\uD83D\uDC4D", "\uD83D\uDE02"] as const;
export type Emoji = (typeof EMOJI_SET)[number];

export interface ReactionCounts {
  [emoji: string]: number;
}

export interface ReactionState {
  counts: ReactionCounts;
  userReactions: Emoji[];
}

// ---------------------------------------------------------------------------
// Signed URL cache (keyed by storage_path, shared across screens)
// ---------------------------------------------------------------------------

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 min (URLs expire at 60 min)

export function getCachedSignedUrl(path: string): string | null {
  const entry = signedUrlCache.get(path);
  if (entry && Date.now() < entry.expiresAt) return entry.url;
  signedUrlCache.delete(path);
  return null;
}

function setCachedSignedUrls(paths: string[], urls: (string | null)[]) {
  const now = Date.now();
  paths.forEach((p, i) => {
    const url = urls[i];
    if (url) signedUrlCache.set(p, { url, expiresAt: now + CACHE_TTL_MS });
  });
}

/**
 * Resolve signed URLs for a list of storage paths, using cache where possible.
 * Returns a Map<storagePath, signedUrl>.
 */
export async function resolveSignedUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const uncached: string[] = [];

  for (const p of paths) {
    const cached = getCachedSignedUrl(p);
    if (cached) {
      result.set(p, cached);
    } else {
      uncached.push(p);
    }
  }

  if (uncached.length > 0) {
    const signed = await createSignedUrlsBatch(
      supabase,
      STORAGE_BUCKETS.POST_MEDIA,
      uncached,
    );
    const urls = signed.map((s) => s.signedUrl);
    setCachedSignedUrls(uncached, urls);
    uncached.forEach((p, i) => {
      if (urls[i]) result.set(p, urls[i]!);
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Create helpers
// ---------------------------------------------------------------------------

/**
 * Insert a new text post for the given author.
 */
export async function createPost(
  authorId: string,
  content: string,
  audience: string = "all",
): Promise<void> {
  const payload: PostInsert = { author_id: authorId, content, audience };
  const { error } = await supabase.from("posts").insert(payload);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Update / Delete helpers
// ---------------------------------------------------------------------------

/**
 * Update the text content of an owned post (RLS: author_id = auth.uid()).
 */
export async function updatePost(postId: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ content: content.trim() })
    .eq("id", postId);
  if (error) throw new Error(error.message);
}

/**
 * Delete a post with storage cleanup (matches web pattern).
 * RLS allows owner OR admin to delete.
 */
export async function deletePost(postId: string): Promise<void> {
  // Fetch attachments to clean up storage files
  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("storage_path, type")
    .eq("post_id", postId);

  const storagePaths = (attachments ?? [])
    .filter((a: { type: string; storage_path: string }) =>
      (a.type === "image" || a.type === "video") && a.storage_path,
    )
    .map((a: { storage_path: string }) => a.storage_path);

  if (storagePaths.length > 0) {
    await supabase.storage.from("post-media").remove(storagePaths);
  }

  // Delete post (cascades to post_attachments, post_reactions, post_comments)
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const FEED_LIMIT = 50;

export interface FeedCommentPreview {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface FeedPost extends PostWithAuthor {
  attachments: PostAttachment[];
  /** Signed URL for first image attachment (if any) */
  imageUrl: string | null;
  /** Reaction counts per emoji */
  reactionCounts: ReactionCounts;
  /** Emojis the current user has reacted with */
  userReactions: Emoji[];
  /** Total number of comments on this post */
  commentCount: number;
  /** Latest comment preview (if any) */
  latestComment: FeedCommentPreview | null;
}

/**
 * Batch-fetch comment counts and latest comment preview for a set of post IDs.
 * Returns maps keyed by post_id.
 */
async function fetchCommentPreviews(postIds: string[]): Promise<{
  countByPost: Map<string, number>;
  latestByPost: Map<string, FeedCommentPreview>;
}> {
  const countByPost = new Map<string, number>();
  const latestByPost = new Map<string, FeedCommentPreview>();

  if (postIds.length === 0) return { countByPost, latestByPost };

  const { data: commentsData } = await supabase
    .from("post_comments")
    .select("id, post_id, author_id, content, created_at, profiles(full_name)")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });

  if (commentsData) {
    for (const c of commentsData as Record<string, unknown>[]) {
      const pid = c.post_id as string;
      countByPost.set(pid, (countByPost.get(pid) ?? 0) + 1);
      // Keep only the latest (first encountered since ordered desc)
      if (!latestByPost.has(pid)) {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        latestByPost.set(pid, {
          id: c.id as string,
          author_id: c.author_id as string,
          author_name: (profile as { full_name?: string } | null)?.full_name ?? "Unknown",
          content: c.content as string,
          created_at: c.created_at as string,
          updated_at: (c.updated_at as string) ?? null,
        });
      }
    }
  }

  return { countByPost, latestByPost };
}

/**
 * Fetch the latest posts with author profiles and first-image signed URLs.
 */
export async function fetchFeedPosts(): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p: { id: string }) => p.id);

  // Fetch attachments for all posts
  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("id, post_id, type, storage_path, url")
    .in("post_id", postIds);

  const attachmentsByPost = new Map<string, PostAttachment[]>();
  if (attachments) {
    for (const a of attachments as PostAttachment[]) {
      const list = attachmentsByPost.get(a.post_id) ?? [];
      list.push(a);
      attachmentsByPost.set(a.post_id, list);
    }
  }

  // Fetch reactions for all posts
  const { data: reactionsData } = await supabase
    .from("post_reactions")
    .select("post_id, user_id, emoji")
    .in("post_id", postIds);

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id ?? null;

  const reactionsByPost = new Map<string, PostReaction[]>();
  if (reactionsData) {
    for (const r of reactionsData as PostReaction[]) {
      const list = reactionsByPost.get(r.post_id) ?? [];
      list.push(r);
      reactionsByPost.set(r.post_id, list);
    }
  }

  // Fetch comment previews for all posts
  const { countByPost, latestByPost } = await fetchCommentPreviews(postIds);

  // Collect first-image storage paths for batch signing
  const firstImagePaths: string[] = [];
  const postIdToFirstImagePath = new Map<string, string>();

  for (const p of posts as { id: string }[]) {
    const postAttachments = attachmentsByPost.get(p.id) ?? [];
    const firstImage = postAttachments.find((a) => a.type === "image");
    if (firstImage) {
      firstImagePaths.push(firstImage.storage_path);
      postIdToFirstImagePath.set(p.id, firstImage.storage_path);
    }
  }

  const signedUrls = await resolveSignedUrls(firstImagePaths);

  return (posts as unknown as PostWithAuthor[]).map((p) => {
    const postAttachments = attachmentsByPost.get(p.id) ?? [];
    const firstImagePath = postIdToFirstImagePath.get(p.id);
    const postReactions = reactionsByPost.get(p.id) ?? [];
    const reactionCounts: ReactionCounts = {};
    for (const r of postReactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
    }
    const userReactions = currentUserId
      ? postReactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji as Emoji)
      : [];
    return {
      ...p,
      attachments: postAttachments,
      imageUrl: firstImagePath ? signedUrls.get(firstImagePath) ?? null : null,
      reactionCounts,
      userReactions,
      commentCount: countByPost.get(p.id) ?? 0,
      latestComment: latestByPost.get(p.id) ?? null,
    };
  });
}

export interface PostDetail extends PostWithAuthor {
  attachments: PostAttachment[];
  /** Signed URLs keyed by storage_path */
  imageUrls: Map<string, string>;
  /** Reaction counts per emoji */
  reactionCounts: ReactionCounts;
  /** Emojis the current user has reacted with */
  userReactions: Emoji[];
}

/**
 * Fetch a single post by ID with author and all attachments (with signed URLs).
 */
/**
 * Fetch the latest posts authored by a specific user.
 */
const MY_POSTS_LIMIT = 5;

export async function fetchUserPosts(userId: string): Promise<FeedPost[]> {
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(MY_POSTS_LIMIT);

  if (error) throw new Error(error.message);
  if (!posts || posts.length === 0) return [];

  const postIds = posts.map((p: { id: string }) => p.id);

  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("id, post_id, type, storage_path, url")
    .in("post_id", postIds);

  const attachmentsByPost = new Map<string, PostAttachment[]>();
  if (attachments) {
    for (const a of attachments as PostAttachment[]) {
      const list = attachmentsByPost.get(a.post_id) ?? [];
      list.push(a);
      attachmentsByPost.set(a.post_id, list);
    }
  }

  // Fetch reactions for user posts
  const { data: reactionsData } = await supabase
    .from("post_reactions")
    .select("post_id, user_id, emoji")
    .in("post_id", postIds);

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id ?? null;

  const reactionsByPost = new Map<string, PostReaction[]>();
  if (reactionsData) {
    for (const r of reactionsData as PostReaction[]) {
      const list = reactionsByPost.get(r.post_id) ?? [];
      list.push(r);
      reactionsByPost.set(r.post_id, list);
    }
  }

  // Fetch comment previews for user posts
  const { countByPost, latestByPost } = await fetchCommentPreviews(postIds);

  const firstImagePaths: string[] = [];
  const postIdToFirstImagePath = new Map<string, string>();

  for (const p of posts as { id: string }[]) {
    const postAttachments = attachmentsByPost.get(p.id) ?? [];
    const firstImage = postAttachments.find((a) => a.type === "image");
    if (firstImage) {
      firstImagePaths.push(firstImage.storage_path);
      postIdToFirstImagePath.set(p.id, firstImage.storage_path);
    }
  }

  const signedUrls = await resolveSignedUrls(firstImagePaths);

  return (posts as unknown as PostWithAuthor[]).map((p) => {
    const postAttachments = attachmentsByPost.get(p.id) ?? [];
    const firstImagePath = postIdToFirstImagePath.get(p.id);
    const postReactions = reactionsByPost.get(p.id) ?? [];
    const reactionCounts: ReactionCounts = {};
    for (const r of postReactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
    }
    const userReactions = currentUserId
      ? postReactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji as Emoji)
      : [];
    return {
      ...p,
      attachments: postAttachments,
      imageUrl: firstImagePath ? signedUrls.get(firstImagePath) ?? null : null,
      reactionCounts,
      userReactions,
      commentCount: countByPost.get(p.id) ?? 0,
      latestComment: latestByPost.get(p.id) ?? null,
    };
  });
}

export async function fetchPostById(postId: string): Promise<PostDetail> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, author_id, content, audience, created_at, profiles(full_name, avatar_path)")
    .eq("id", postId)
    .single();

  if (error || !post) throw new Error(error?.message ?? "Post not found");

  const { data: attachments } = await supabase
    .from("post_attachments")
    .select("id, post_id, type, storage_path, url")
    .eq("post_id", postId);

  const postAttachments = (attachments ?? []) as PostAttachment[];
  const imagePaths = postAttachments
    .filter((a) => a.type === "image")
    .map((a) => a.storage_path);

  const imageUrls = await resolveSignedUrls(imagePaths);

  // Fetch reactions for this post
  const { data: reactionsData } = await supabase
    .from("post_reactions")
    .select("post_id, user_id, emoji")
    .eq("post_id", postId);

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id ?? null;

  const postReactions = (reactionsData ?? []) as PostReaction[];
  const reactionCounts: ReactionCounts = {};
  for (const r of postReactions) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
  }
  const userReactions = currentUserId
    ? postReactions.filter((r) => r.user_id === currentUserId).map((r) => r.emoji as Emoji)
    : [];

  return {
    ...(post as unknown as PostWithAuthor),
    attachments: postAttachments,
    imageUrls,
    reactionCounts,
    userReactions,
  };
}

// ---------------------------------------------------------------------------
// Comment helpers
// ---------------------------------------------------------------------------

export interface CommentWithAuthor extends PostComment {
  author_name: string;
}

/**
 * Fetch all comments for a post, oldest first, with author names.
 */
export async function fetchComments(postId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, post_id, author_id, content, created_at, updated_at, profiles(full_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((c: Record<string, unknown>) => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    return {
      id: c.id as string,
      post_id: c.post_id as string,
      author_id: c.author_id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      updated_at: (c.updated_at as string) ?? null,
      author_name: (profile as { full_name?: string } | null)?.full_name ?? "Unknown",
    };
  });
}

/**
 * Delete a comment by ID.
 * RLS allows owner (author_id = auth.uid()) OR admin to delete.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw new Error(error.message);
}

/**
 * Update a comment's content.
 * RLS allows only the comment author (author_id = auth.uid()) to update.
 */
export async function updateComment(commentId: string, content: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("post_comments")
    .update({ content: content.trim(), updated_at: now })
    .eq("id", commentId);
  if (error) throw new Error(error.message);
}

/**
 * Add a comment to a post. Returns the newly created comment with author name.
 */
export async function addComment(postId: string, content: string): Promise<CommentWithAuthor> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: userId, content: content.trim() })
    .select("id, post_id, author_id, content, created_at, updated_at, profiles(full_name)")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to add comment");

  const row = data as Record<string, unknown>;
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id as string,
    post_id: row.post_id as string,
    author_id: row.author_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
    updated_at: (row.updated_at as string) ?? null,
    author_name: (profile as { full_name?: string } | null)?.full_name ?? "Unknown",
  };
}

// ---------------------------------------------------------------------------
// Reaction toggle (matches web pattern: delete if exists, insert if not)
// ---------------------------------------------------------------------------

export async function toggleReaction(
  postId: string,
  emoji: Emoji,
  hasReacted: boolean,
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Not signed in");

  if (hasReacted) {
    const { error } = await supabase
      .from("post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: userId, emoji });
    if (error) throw new Error(error.message);
  }
}
