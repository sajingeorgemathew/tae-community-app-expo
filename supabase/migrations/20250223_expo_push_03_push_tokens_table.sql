-- EXPO-PUSH-03: push_tokens table + RLS
--
-- Backend foundation for Expo push token persistence. This migration
-- creates the `public.push_tokens` table, constraints, an index used
-- by the future send fan-out, and owner-only RLS policies.
--
-- What this ticket DOES:
--   - defines the table shape (multi-device per user, provider-agnostic)
--   - enables RLS with owner-only read/write
--   - adds a partial index on enabled tokens for cheap fan-out lookups
--
-- What this ticket DOES NOT do (deferred to later tickets):
--   - EXPO-PUSH-04: mobile token registration / upsert flow
--   - EXPO-PUSH-05: Supabase Edge Function `send-push` + triggers
--   - No service-role read policy is required: the send pipeline will
--     read via the service role key inside an Edge Function, which
--     bypasses RLS by design.

-- ============================================================
-- 1. Create the push_tokens table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  device_id     text NOT NULL,
  token         text NOT NULL,
  provider      text NOT NULL DEFAULT 'expo'
                  CHECK (provider IN ('expo', 'fcm', 'apns')),
  platform      text NOT NULL
                  CHECK (platform IN ('ios', 'android')),
  app_version   text,
  enabled       boolean NOT NULL DEFAULT true,
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

COMMENT ON TABLE  public.push_tokens IS 'Per-user, per-device push notification tokens. One row per (user_id, device_id).';
COMMENT ON COLUMN public.push_tokens.device_id    IS 'Stable client-generated UUID persisted in expo-secure-store. Survives token rotation.';
COMMENT ON COLUMN public.push_tokens.token        IS 'Opaque push token string. For provider=expo this is an ExponentPushToken[...] value.';
COMMENT ON COLUMN public.push_tokens.provider     IS 'Delivery provider: expo today; fcm/apns reserved for future direct integration.';
COMMENT ON COLUMN public.push_tokens.platform     IS 'Device OS family. Used for per-platform payload shaping in the send pipeline.';
COMMENT ON COLUMN public.push_tokens.app_version  IS 'App version at last registration. Useful for debugging stale clients.';
COMMENT ON COLUMN public.push_tokens.enabled      IS 'Soft-disable flag. Set to false when Expo returns DeviceNotRegistered, on sign-out, etc.';
COMMENT ON COLUMN public.push_tokens.last_seen_at IS 'Updated by the client on each foreground registration. Used to age out stale rows.';

-- ============================================================
-- 2. Index for send fan-out
-- ============================================================
-- Partial index: the send pipeline only cares about enabled rows, so
-- keeping disabled rows out of the index keeps lookups cheap.
CREATE INDEX IF NOT EXISTS push_tokens_user_enabled_idx
  ON public.push_tokens (user_id)
  WHERE enabled;

-- ============================================================
-- 3. Enable RLS
-- ============================================================
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS policies — owner only
-- ============================================================
-- The send pipeline will run as the service role inside an Edge
-- Function and therefore bypasses RLS, so no service-role policy is
-- needed here. Authenticated clients may only touch their own rows.

CREATE POLICY "Owners can read their own push tokens"
  ON public.push_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owners can insert their own push tokens"
  ON public.push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can update their own push tokens"
  ON public.push_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners can delete their own push tokens"
  ON public.push_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
