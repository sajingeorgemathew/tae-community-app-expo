import type { PostWithAuthor, PostAttachment, PostInsert, PostReaction } from "@tae/shared";
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
// Fetch helpers
// ---------------------------------------------------------------------------

const FEED_LIMIT = 50;

export interface FeedPost extends PostWithAuthor {
  attachments: PostAttachment[];
  /** Signed URL for first image attachment (if any) */
  imageUrl: string | null;
  /** Reaction counts per emoji */
  reactionCounts: ReactionCounts;
  /** Emojis the current user has reacted with */
  userReactions: Emoji[];
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
