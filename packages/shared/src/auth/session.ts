/**
 * Supabase auth session helpers — platform-agnostic.
 *
 * These helpers configure a Supabase client for mobile-style auth
 * (custom storage adapter, no URL-based session detection) and provide
 * convenience wrappers for common auth operations.
 */

import {
  createClient,
  type SupabaseClient,
  type Session,
  type AuthChangeEvent,
} from "@supabase/supabase-js";
import type { StorageAdapter } from "./storage";

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export interface AuthClientOptions {
  url: string;
  anonKey: string;
  storageAdapter: StorageAdapter;
}

/**
 * Create a Supabase client configured for mobile auth.
 *
 * - persistSession: true  — uses the provided StorageAdapter
 * - autoRefreshToken: true — supabase-js handles token refresh
 * - detectSessionInUrl: false — no URL-based auth on mobile
 */
export function createSupabaseClientWithAuthStorage({
  url,
  anonKey,
  storageAdapter,
}: AuthClientOptions): SupabaseClient {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: storageAdapter,
    },
  });
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve the current session from the Supabase client.
 * Returns `null` if no session exists or if the session is invalid.
 */
export async function getInitialSession(
  client: SupabaseClient
): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    return null;
  }
  return data.session;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuthChanges(
  client: SupabaseClient,
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange(callback);

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Sign out with error handling. Returns `true` on success.
 */
export async function signOutSafe(client: SupabaseClient): Promise<boolean> {
  const { error } = await client.auth.signOut();
  if (error) {
    console.error("[signOutSafe]", error.message);
    return false;
  }
  return true;
}
