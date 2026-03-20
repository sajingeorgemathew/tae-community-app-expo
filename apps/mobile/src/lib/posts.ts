import type { PostWithAuthor, PostAttachment, PostInsert } from "@tae/shared";
import { createSignedUrlsBatch, STORAGE_BUCKETS } from "@tae/shared";
import { supabase } from "./supabase";

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
export async function createPost(authorId: string, content: string): Promise<void> {
  const payload: PostInsert = { author_id: authorId, content };
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
    return {
      ...p,
      attachments: postAttachments,
      imageUrl: firstImagePath ? signedUrls.get(firstImagePath) ?? null : null,
    };
  });
}

export interface PostDetail extends PostWithAuthor {
  attachments: PostAttachment[];
  /** Signed URLs keyed by storage_path */
  imageUrls: Map<string, string>;
}

/**
 * Fetch a single post by ID with author and all attachments (with signed URLs).
 */
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

  return {
    ...(post as unknown as PostWithAuthor),
    attachments: postAttachments,
    imageUrls,
  };
}
