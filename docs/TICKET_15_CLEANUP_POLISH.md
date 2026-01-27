Ticket 15 — Cleanup & polish (minimum client expectation)

Goal

Make post deletion fully clean (DB + attachments + Storage) and improve empty states.

Requirements

Delete post cleans everything

When a post is deleted (by author or admin), also delete:

related post_attachments rows (DB)

related Storage objects in bucket post-media using storage_path (for image/video types)

Must work for:

author deleting own post

admin deleting any post

Empty states

If feed has no posts: show “No posts yet.”

If filters result in no posts: show “No posts for this filter.”
(Keep it minimal.)

Emojis

Do not add emoji picker.

Emojis remain plain text.

Notes

Bucket is private (post-media), feed uses signed URLs.

Storage deletion likely needs a Storage DELETE policy (authenticated + scope) or will fail.

Keep changes minimal; prefer only touching feed page and docs.

Done when

Deleting a post also removes its storage files (verified in Supabase bucket).

UI updates immediately (post removed from list).

npm run build passes.