// Storage types — based on EXPO-01 supabase-contract.md
// Path helpers moved to ../storage/paths.ts (EXPO-03); legacy re-exports kept below.

/** Known storage bucket names */
export type StorageBucket = "profile-avatars" | "post-media" | "message-media";

/** All bucket names as a const for runtime use */
export const STORAGE_BUCKETS = {
  PROFILE_AVATARS: "profile-avatars" as const,
  POST_MEDIA: "post-media" as const,
  MESSAGE_MEDIA: "message-media" as const,
};

/** Default signed URL expiry in seconds (1 hour) */
export const SIGNED_URL_EXPIRY_SECONDS = 3600;

/** Result from a signed URL request */
export interface SignedUrlResult {
  signedUrl: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Legacy path helpers (EXPO-02) — kept for backward compatibility.
// Prefer the builders in ../storage/paths.ts for new code.
// ---------------------------------------------------------------------------

/** @deprecated Use `buildAvatarPath` from `@tae/shared/storage` */
export function avatarPath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

/** @deprecated Use `buildPostMediaPath` from `@tae/shared/storage` */
export function postMediaPath(userId: string, postId: string, filename: string): string {
  return `${userId}/${postId}/${filename}`;
}

/** @deprecated Use `buildMessageMediaPath` from `@tae/shared/storage` */
export function messageMediaPath(
  conversationId: string,
  messageId: string,
  filename: string,
): string {
  return `messages/${conversationId}/${messageId}/${filename}`;
}
