// URL helpers for Supabase Storage — platform-agnostic.
// These wrap the Supabase client storage API with consistent defaults.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageBucket, SignedUrlResult } from "../types/storage";
import { SIGNED_URL_EXPIRY_SECONDS } from "../types/storage";

// ---------------------------------------------------------------------------
// Public URL (for public buckets — currently none, but ready if post-media
// is switched to public)
// ---------------------------------------------------------------------------

/**
 * Get the public (unauthenticated) URL for an object.
 * Only works for public buckets.
 */
export function getPublicUrl(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Signed URLs (for private buckets)
// ---------------------------------------------------------------------------

/**
 * Create a time-limited signed URL for a single object.
 * Default TTL: 1 hour (matches web app behaviour).
 */
export async function createSignedUrl(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignedUrlResult> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data) {
    return { signedUrl: null, error: error?.message ?? "Unknown error" };
  }
  return { signedUrl: data.signedUrl, error: null };
}

/**
 * Create signed URLs for multiple objects in a single request.
 * Supabase supports batch signing via `createSignedUrls` (plural).
 */
export async function createSignedUrlsBatch(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  paths: string[],
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<SignedUrlResult[]> {
  if (paths.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) {
    return paths.map(() => ({
      signedUrl: null,
      error: error?.message ?? "Unknown error",
    }));
  }

  return data.map((item) => ({
    signedUrl: item.signedUrl ?? null,
    error: item.error ? String(item.error) : null,
  }));
}
