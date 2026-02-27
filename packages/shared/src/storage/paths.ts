// Authoritative path builders for Supabase Storage buckets.
// These MUST match the path conventions used by apps/web and
// the RLS policy helper functions (is_avatar_path_owner, extract_conversation_id_from_path).

import { STORAGE_BUCKETS, type StorageBucket } from "../types/storage";

// ---------------------------------------------------------------------------
// Extension helpers
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "heic",
  "heif",
  "svg",
]);

const ALLOWED_VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "avi", "mkv"]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt"]);

const ALLOWED_EXTENSIONS = new Set([
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_VIDEO_EXTENSIONS,
  ...ALLOWED_DOCUMENT_EXTENSIONS,
]);

/**
 * Normalize a file extension: lowercase, strip leading dot, fallback to "bin".
 */
export function normalizeExtension(raw: string): string {
  const ext = raw.replace(/^\./, "").toLowerCase().trim();
  return ext || "bin";
}

/**
 * Extract the extension from a filename, normalized.
 */
export function extractExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? normalizeExtension(parts.pop()!) : "bin";
}

/**
 * Check whether an extension is in the allowed set.
 */
export function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(normalizeExtension(ext));
}

export function isImageExtension(ext: string): boolean {
  return ALLOWED_IMAGE_EXTENSIONS.has(normalizeExtension(ext));
}

export function isVideoExtension(ext: string): boolean {
  return ALLOWED_VIDEO_EXTENSIONS.has(normalizeExtension(ext));
}

// ---------------------------------------------------------------------------
// UUID helper (tiny fallback for environments without crypto.randomUUID)
// ---------------------------------------------------------------------------

function defaultFileId(): string {
  // Prefer crypto.randomUUID when available; fall back to timestamp+random.
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Path builders — match existing web app conventions exactly
// ---------------------------------------------------------------------------

/**
 * Avatar path: `avatars/{userId}/avatar.{ext}`
 *
 * The web app uses `upsert: true` so there's always one avatar per user.
 * Policy `is_avatar_path_owner` checks that the path starts with `avatars/{auth.uid()}`.
 */
export function buildAvatarPath({
  userId,
  ext,
}: {
  userId: string;
  ext: string;
  fileId?: string; // ignored — avatars always use "avatar" as filename
}): string {
  return `avatars/${userId}/avatar.${normalizeExtension(ext)}`;
}

/**
 * Post media path: `posts/{postId}/{fileId}.{ext}`
 *
 * Web uses `upsert: false`. Each attachment gets its own UUID.
 * Policy checks that the authenticated user uploaded to their own userId prefix —
 * however the actual web code uses `posts/{postId}/` not `{userId}/{postId}/`.
 * We match the actual code.
 */
export function buildPostMediaPath({
  postId,
  ext,
  fileId,
}: {
  postId: string;
  ext: string;
  fileId?: string;
}): string {
  const id = fileId ?? defaultFileId();
  return `posts/${postId}/${id}.${normalizeExtension(ext)}`;
}

/**
 * Message media path: `messages/{conversationId}/{messageId}/{fileId}.{ext}`
 *
 * Policy `extract_conversation_id_from_path` splits on '/' and reads segment [1]
 * (segment [0] = "messages").
 */
export function buildMessageMediaPath({
  conversationId,
  messageId,
  ext,
  fileId,
}: {
  conversationId: string;
  messageId: string;
  ext: string;
  fileId?: string;
}): string {
  const id = fileId ?? defaultFileId();
  return `messages/${conversationId}/${messageId}/${id}.${normalizeExtension(ext)}`;
}

// ---------------------------------------------------------------------------
// Bucket for path (reverse lookup)
// ---------------------------------------------------------------------------

/**
 * Given a storage path, return the bucket it likely belongs to.
 */
export function bucketForPath(path: string): StorageBucket | null {
  if (path.startsWith("avatars/")) return STORAGE_BUCKETS.PROFILE_AVATARS;
  if (path.startsWith("posts/")) return STORAGE_BUCKETS.POST_MEDIA;
  if (path.startsWith("messages/")) return STORAGE_BUCKETS.MESSAGE_MEDIA;
  return null;
}
