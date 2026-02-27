// Storage types — based on EXPO-01 supabase-contract.md

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

// --- Path helpers ---

/** Build avatar storage path: {userId}/{filename} */
export function avatarPath(userId: string, filename: string): string {
  return `${userId}/${filename}`;
}

/** Build post media storage path: {userId}/{postId}/{filename} */
export function postMediaPath(userId: string, postId: string, filename: string): string {
  return `${userId}/${postId}/${filename}`;
}

/** Build message media storage path: messages/{conversationId}/{messageId}/{filename} */
export function messageMediaPath(
  conversationId: string,
  messageId: string,
  filename: string,
): string {
  return `messages/${conversationId}/${messageId}/${filename}`;
}
