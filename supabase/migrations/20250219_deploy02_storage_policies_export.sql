-- DEPLOY-02: Export storage.objects policies to repo (source of truth)
-- Covers: post-media, profile-avatars, message-media
-- Idempotent: drop-if-exists then create

-- ============================================================
-- A) post-media bucket
-- ============================================================

-- Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- SELECT: authenticated users can read post media
drop policy if exists "Authenticated can read post media" on storage.objects;
create policy "Authenticated can read post media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-media');

-- INSERT: authenticated users can upload post media
drop policy if exists "Authenticated can upload post media" on storage.objects;
create policy "Authenticated can upload post media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media');

-- DELETE: uploader or admin can delete (already in 20250127, re-export for completeness)
drop policy if exists "Uploader or admin can delete media" on storage.objects;
create policy "Uploader or admin can delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (
      exists (
        select 1 from public.post_attachments
        where storage_path = name and uploader_id = auth.uid()
      )
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- ============================================================
-- B) profile-avatars bucket
-- ============================================================

-- Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', false)
on conflict (id) do nothing;

-- SELECT: authenticated users can read profile avatars
drop policy if exists "Authenticated users can read profile avatars" on storage.objects;
create policy "Authenticated users can read profile avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'profile-avatars');

-- INSERT: only owner (path-based via is_avatar_path_owner)
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  );

-- UPDATE: only owner (path-based)
drop policy if exists "Users can update their own avatar" on storage.objects;
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
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and public.is_avatar_path_owner(name)
  );

-- ============================================================
-- C) message-media bucket
-- ============================================================

-- Ensure bucket exists
insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do nothing;

-- SELECT: members can view message media
drop policy if exists "Members can view message media" on storage.objects;
create policy "Members can view message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.conversation_members
      where conversation_id = public.extract_conversation_id_from_path(name)
        and user_id = auth.uid()
    )
  );

-- INSERT: members can upload message media
drop policy if exists "Members can upload message media" on storage.objects;
create policy "Members can upload message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and name like 'messages/%'
    and public.extract_conversation_id_from_path(name) is not null
    and exists (
      select 1
      from public.conversation_members
      where conversation_id = public.extract_conversation_id_from_path(name)
        and user_id = auth.uid()
    )
  );

-- DELETE: message sender can delete media
drop policy if exists "Message sender can delete media" on storage.objects;
create policy "Message sender can delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.message_attachments ma
      join public.messages m on m.id = ma.message_id
      where ma.storage_path = name
        and m.sender_id = auth.uid()
    )
  );
