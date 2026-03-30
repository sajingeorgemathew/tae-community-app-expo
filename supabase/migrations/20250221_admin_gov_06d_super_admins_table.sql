-- ADMIN-GOV-06D: Super-admin DB foundation
--
-- Creates the `super_admins` overlay table.
-- Super-admin is NOT a new role — it is a governance overlay on top of
-- the existing `admin` role. A user's `profiles.role` remains unchanged.
--
-- After this migration, super-admin status is determined by:
--   1) membership in the env-based SUPER_ADMIN_IDS bootstrap allowlist, OR
--   2) existence of a row in this `super_admins` table.
--
-- This migration creates read policies so authenticated users can check
-- super-admin status. Write policies (INSERT/DELETE) are intentionally
-- deferred to the next ticket (grant/revoke UI) where an RPC or
-- server-side function will handle mutations with proper authorization.

-- ============================================================
-- 1. Create the super_admins table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.super_admins IS 'Governance overlay: DB-backed super-admin identities. Does NOT replace the env bootstrap allowlist.';
COMMENT ON COLUMN public.super_admins.user_id    IS 'The user who holds super-admin status (must also have role = admin in profiles).';
COMMENT ON COLUMN public.super_admins.created_at IS 'When this super-admin entry was created.';
COMMENT ON COLUMN public.super_admins.created_by IS 'The super-admin who granted this status (NULL for bootstrap / seed inserts).';

-- ============================================================
-- 2. Enable RLS
-- ============================================================
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS policies
-- ============================================================

-- SELECT: any authenticated user can read the table.
-- This is required so the app can check super-admin status at runtime.
CREATE POLICY "Authenticated users can read super_admins"
  ON public.super_admins
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE policies are intentionally NOT created here.
-- Mutations will be handled via a secure RPC (or service-role call) in
-- the next ticket (grant/revoke). This ensures no client can write to
-- the table through the anon/authenticated Supabase client until the
-- proper authorization layer is built.
--
-- With RLS enabled and no INSERT/UPDATE/DELETE policies, the table is
-- effectively read-only for all authenticated clients (fail-closed).

-- ============================================================
-- 4. Index (optional, for join performance)
-- ============================================================
-- PK already provides a unique index on user_id.
-- No additional indexes needed at this scale.
