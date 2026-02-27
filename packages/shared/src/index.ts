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
