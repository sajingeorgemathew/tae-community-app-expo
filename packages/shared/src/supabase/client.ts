// Shared Supabase client factory — platform-agnostic
// Caller provides credentials; no process.env access here.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseClientOptions {
  url: string;
  anonKey: string;
}

/**
 * Create a Supabase client with the given credentials.
 * Works in both web (Next.js) and mobile (Expo) environments.
 */
export function createSupabaseClient({ url, anonKey }: SupabaseClientOptions): SupabaseClient {
  return createClient(url, anonKey);
}

export type { SupabaseClient };
