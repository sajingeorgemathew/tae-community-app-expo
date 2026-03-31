-- ADMIN-GOV-06E: Super-admin grant/revoke system
--
-- Adds two SECURITY DEFINER RPCs so that an existing super-admin can
-- grant or revoke super-admin status at runtime. Both functions enforce:
--   1) caller must be authenticated
--   2) caller must already be a super-admin (env OR DB)
--   3) target must have role = 'admin' in profiles (for grant)
--   4) cannot self-revoke
--   5) cannot remove the last super-admin (for revoke)
--
-- No INSERT/UPDATE/DELETE RLS policies are added — all mutations go
-- through these RPCs which run as SECURITY DEFINER (bypassing RLS).

-- ============================================================
-- 1. grant_super_admin(target_user_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.grant_super_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_is_super boolean;
  target_role text;
BEGIN
  -- 1. Must be authenticated
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Caller must be a super-admin (DB table check only;
  --    env allowlist is checked client-side and is additive)
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = caller_id
  ) INTO caller_is_super;

  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Forbidden: caller is not a super-admin';
  END IF;

  -- 3. Target must exist and have role = 'admin'
  SELECT role INTO target_role
    FROM public.profiles
   WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF target_role <> 'admin' THEN
    RAISE EXCEPTION 'Target user must have admin role before granting super-admin';
  END IF;

  -- 4. Insert (no-op if already a super-admin)
  INSERT INTO public.super_admins (user_id, created_by)
  VALUES (target_user_id, caller_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION public.grant_super_admin IS
  'Grant super-admin status to an admin user. Caller must be a super-admin.';

-- ============================================================
-- 2. revoke_super_admin(target_user_id uuid)
-- ============================================================
CREATE OR REPLACE FUNCTION public.revoke_super_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id uuid;
  caller_is_super boolean;
  sa_count integer;
BEGIN
  -- 1. Must be authenticated
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Caller must be a super-admin
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = caller_id
  ) INTO caller_is_super;

  IF NOT caller_is_super THEN
    RAISE EXCEPTION 'Forbidden: caller is not a super-admin';
  END IF;

  -- 3. Cannot self-revoke
  IF caller_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot revoke your own super-admin status';
  END IF;

  -- 4. Prevent removing the last super-admin
  SELECT count(*) INTO sa_count FROM public.super_admins;
  IF sa_count <= 1 THEN
    RAISE EXCEPTION 'Cannot revoke the last super-admin';
  END IF;

  -- 5. Delete the row (no-op if not present)
  DELETE FROM public.super_admins WHERE user_id = target_user_id;
END;
$$;

COMMENT ON FUNCTION public.revoke_super_admin IS
  'Revoke super-admin status from a user. Caller must be a super-admin. Cannot self-revoke or remove the last super-admin.';
