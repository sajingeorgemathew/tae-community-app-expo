// @tae/shared — shared types, Supabase helpers, and validators

// Entity types
export * from "./types";

// Supabase client helper
export { createSupabaseClient } from "./supabase/client";
export type { SupabaseClientOptions } from "./supabase/client";

// Validators
export {
  requireString,
  requireUUID,
  validateMessageInsert,
  validatePostInsert,
} from "./validators";

// Auth helpers (EXPO-04)
export {
  type StorageAdapter,
  AUTH_STORAGE_KEYS,
  createInMemoryStorageAdapter,
  type AuthClientOptions,
  createSupabaseClientWithAuthStorage,
  getInitialSession,
  subscribeToAuthChanges,
  signOutSafe,
  PROTECTED_ROUTE_PREFIXES,
  AUTH_ONLY_ROUTES,
  isProtectedRoute,
  getInitialRoute,
  shouldRedirect,
} from "./auth";

// Storage helpers (EXPO-03)
export {
  normalizeExtension,
  extractExtension,
  isAllowedExtension,
  isImageExtension,
  isVideoExtension,
  buildAvatarPath,
  buildPostMediaPath,
  buildMessageMediaPath,
  bucketForPath,
  getPublicUrl,
  createSignedUrl,
  createSignedUrlsBatch,
  uploadFile,
  removeFile,
} from "./storage";
export type { UploadSource, UploadResult } from "./storage";
