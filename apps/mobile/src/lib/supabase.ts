/**
 * Singleton Supabase client for the mobile app.
 *
 * Uses createSupabaseClientWithAuthStorage from @tae/shared
 * with SecureStore-backed storage adapter.
 */

import "react-native-url-polyfill/auto";

import { createSupabaseClientWithAuthStorage } from "@tae/shared";
import { ENV } from "../config/env";
import { storageAdapter } from "./storageAdapter";

export const supabase = createSupabaseClientWithAuthStorage({
  url: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  storageAdapter,
});
