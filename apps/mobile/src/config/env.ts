/**
 * Environment configuration for the mobile app.
 *
 * Expo makes EXPO_PUBLIC_* vars available at build time via process.env.
 * See .env.example for required values.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL.\n" +
      "Copy apps/mobile/.env.example to apps/mobile/.env and fill in your Supabase project URL.",
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Copy apps/mobile/.env.example to apps/mobile/.env and fill in your Supabase anon key.",
  );
}

export const ENV = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} as const;
