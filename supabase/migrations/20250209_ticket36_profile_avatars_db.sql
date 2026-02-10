-- Ticket 36: DB + Storage foundation for profile pictures
-- Adds avatar_path, headline, skills columns to profiles,
-- creates profile-avatars bucket, and sets up storage RLS policies.

-- ============================================================
-- 1. ALTER profiles: add new columns
-- ============================================================
alter table public.profiles
  add column if not exists avatar_path text null;

alter table public.profiles
  add column if not exists headline text null;

alter table public.profiles
  add column if not exists skills text[] not null default '{}'::text[];

-- ============================================================
-- 2. Create private storage bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

-- ============================================================
-- 3. Helper: is_avatar_path_owner(path text)
--    Expects path format: avatars/{user_uuid}/...
--    Returns true only when the embedded uuid matches auth.uid()
-- ============================================================
create or replace function public.is_avatar_path_owner(path text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[];
begin
  -- split on '/'
  parts := string_to_array(path, '/');

  -- must have at least: avatars / {uuid} / {filename}
  if array_length(parts, 1) < 3 then
    return false;
  end if;

  -- first segment must be 'avatars'
  if parts[1] <> 'avatars' then
    return false;
  end if;

  -- second segment must match the authenticated user's id
  return parts[2]::uuid = auth.uid();

exception
  when others then
    -- malformed uuid or any other error → deny
    return false;
end;
$$;

-- ============================================================
-- 4. Storage RLS policies on storage.objects for profile-avatars
-- ============================================================

-- SELECT: any authenticated user can read
drop policy if exists "Authenticated users can read profile avatars"
  on storage.objects;
create policy "Authenticated users can read profile avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile-avatars');

-- INSERT: only owner (path-based)
drop policy if exists "Users can upload their own avatar"
  on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  );

-- UPDATE: only owner (path-based)
drop policy if exists "Users can update their own avatar"
  on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  )
  with check (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  );

-- DELETE: only owner (path-based)
drop policy if exists "Users can delete their own avatar"
  on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  );

/*
=== How to apply ===

1. Run this entire SQL in the Supabase SQL Editor.

2. Verify:
   - Dashboard → Database → Tables → profiles has avatar_path, headline, skills columns
   - Dashboard → Storage → Buckets → profile-avatars exists (private)
   - Dashboard → Storage → Policies → profile-avatars has 4 policies

=== Verification queries ===

-- Check new columns exist
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in ('avatar_path', 'headline', 'skills');

-- Check bucket exists and is private
select id, name, public from storage.buckets where id = 'profile-avatars';

-- Check helper function exists
select proname, prosecdef, provolatile
from pg_proc where proname = 'is_avatar_path_owner';

-- Check storage policies
select policyname, cmd
from pg_policies
where tablename = 'objects'
  and policyname like '%avatar%';

=== How to test ===

-- Helper function: should return true
select public.is_avatar_path_owner('avatars/' || auth.uid()::text || '/photo.jpg');

-- Helper function: should return false (wrong user)
select public.is_avatar_path_owner('avatars/00000000-0000-0000-0000-000000000000/photo.jpg');

-- Helper function: should return false (malformed)
select public.is_avatar_path_owner('bad/path');
select public.is_avatar_path_owner('avatars/not-a-uuid/photo.jpg');
*/
