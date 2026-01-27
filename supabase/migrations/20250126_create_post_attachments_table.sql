-- Ticket 11: Post attachments table with RLS

-- Create post_attachments table
create table public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('image', 'video', 'link')),
  storage_path text,
  url text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),

  -- Constraint: image/video requires storage_path
  constraint attachment_storage_path_required
    check (type not in ('image', 'video') or storage_path is not null),

  -- Constraint: link requires url
  constraint attachment_url_required
    check (type != 'link' or url is not null)
);

-- Enable RLS
alter table public.post_attachments enable row level security;

-- SELECT: authenticated users can read all attachments
create policy "Authenticated can read all attachments"
  on public.post_attachments for select
  to authenticated
  using (true);

-- INSERT: authenticated users can insert only if uploader_id = auth.uid()
create policy "Users can insert own attachments"
  on public.post_attachments for insert
  to authenticated
  with check (uploader_id = auth.uid());

-- DELETE: uploader can delete own attachments, admin can delete any
create policy "Users can delete own attachments or admin any"
  on public.post_attachments for delete
  to authenticated
  using (
    uploader_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- No UPDATE policy (updates not allowed)

/*
=== How to test in Supabase ===

1. Run this SQL in the Supabase SQL Editor.

2. Test SELECT (as any authenticated user):
   select * from post_attachments;

3. Test INSERT image (should succeed with own uid and storage_path):
   insert into post_attachments (post_id, uploader_id, type, storage_path, mime_type, size_bytes)
   values ('<post-id>', auth.uid(), 'image', 'post-media/test.jpg', 'image/jpeg', 12345);

4. Test INSERT image without storage_path (should fail):
   insert into post_attachments (post_id, uploader_id, type)
   values ('<post-id>', auth.uid(), 'image');

5. Test INSERT link (should succeed with url):
   insert into post_attachments (post_id, uploader_id, type, url)
   values ('<post-id>', auth.uid(), 'link', 'https://example.com');

6. Test INSERT link without url (should fail):
   insert into post_attachments (post_id, uploader_id, type)
   values ('<post-id>', auth.uid(), 'link');

7. Test INSERT with different uploader_id (should fail):
   insert into post_attachments (post_id, uploader_id, type, url)
   values ('<post-id>', '00000000-0000-0000-0000-000000000000', 'link', 'https://example.com');

8. Test DELETE as uploader:
   delete from post_attachments where id = '<your-attachment-id>';

9. Test DELETE as admin:
   - Set your profile role to 'admin' first
   - delete from post_attachments where id = '<any-attachment-id>';

10. Verify policies in Dashboard → Authentication → Policies → post_attachments table
*/
