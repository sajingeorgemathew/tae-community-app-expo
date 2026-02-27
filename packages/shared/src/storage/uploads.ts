// Upload types and contract — platform-agnostic interfaces.
// Actual implementations will differ:
//   - Web: File / Blob from <input type="file">
//   - Expo: uri from expo-image-picker → converted to ArrayBuffer

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageBucket } from "../types/storage";

// ---------------------------------------------------------------------------
// Upload source — what callers provide
// ---------------------------------------------------------------------------

/**
 * Platform-agnostic description of a file to upload.
 * Each platform adapter converts its native pick result into this shape.
 */
export interface UploadSource {
  /** Storage path (use buildXxxPath helpers to generate). */
  path: string;
  /** Target bucket. */
  bucket: StorageBucket;
  /** MIME type, e.g. "image/jpeg". */
  contentType: string;
  /**
   * The file body.
   * - Web: `File` or `Blob`
   * - Expo: `ArrayBuffer` (read from file URI via expo-file-system)
   */
  body: Blob | ArrayBuffer;
  /** Whether to overwrite an existing file at the same path. */
  upsert?: boolean;
}

// ---------------------------------------------------------------------------
// Upload result
// ---------------------------------------------------------------------------

export interface UploadResult {
  /** The storage path that was uploaded to. */
  path: string;
  /** Error message, or null on success. */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Upload function signature
// ---------------------------------------------------------------------------

/**
 * Upload a single file to Supabase Storage.
 * This is the shared contract — both web and mobile use the same signature.
 */
export async function uploadFile(
  supabase: SupabaseClient,
  source: UploadSource,
): Promise<UploadResult> {
  const { data, error } = await supabase.storage
    .from(source.bucket)
    .upload(source.path, source.body, {
      contentType: source.contentType,
      upsert: source.upsert ?? false,
    });

  if (error) {
    return { path: source.path, error: error.message };
  }
  return { path: data.path, error: null };
}

/**
 * Remove a file from Supabase Storage.
 */
export async function removeFile(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  paths: string[],
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  return { error: error?.message ?? null };
}
