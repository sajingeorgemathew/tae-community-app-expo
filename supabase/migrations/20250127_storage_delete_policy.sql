-- Ticket 15: Storage DELETE policy for post-media bucket
-- Allows users to delete their own uploads or admins to delete any upload

-- DELETE policy: uploader (via post_attachments lookup) or admin can delete
create policy "Uploader or admin can delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (
      -- Uploader: owns the attachment in post_attachments
      exists (
        select 1 from public.post_attachments
        where storage_path = name and uploader_id = auth.uid()
      )
      -- Admin: can delete any attachment
      or exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

/*
=== How to apply ===

1. Run this SQL in the Supabase SQL Editor.

2. Verify in Dashboard -> Storage -> Policies -> post-media bucket

=== How to test ===

1. As uploader: delete an image you uploaded
   - Should succeed

2. As admin: delete any image
   - Should succeed

3. As non-owner non-admin: delete someone else's image
   - Should fail with permission error
*/
