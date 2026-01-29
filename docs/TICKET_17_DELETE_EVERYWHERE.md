Ticket 17 — Delete everywhere (UI + permission wiring)

Goal
If user can delete (author/admin), they can delete from any place they see the post.

Scope

Use the same delete permission logic everywhere.

Prefer: compute once per page (or centralized helper) and pass into PostCard via props.

Add Delete action in:

Feed cards: /app/feed

My Posts cards: /app/me

Member profile cards: /app/profile/[id]

Only show Delete if allowed (author or admin)

Important

Do NOT loosen DB RLS. UI is convenience only.

DB policies remain the source of truth.

Behavior requirements

Clicking Delete:

confirms

deletes attachments (storage objects) first (if exists)

deletes post row

UI updates immediately (remove card from list) without refresh

Implementation notes

Reuse the existing delete flow already implemented in /app/feed:

fetch post_attachments for the post

delete storage objects (bucket: post-media) for image/video

delete post

rely on cascade to delete attachment rows

Ensure Delete is available in PostCard via canDelete + onDelete.

Pages /app/me and /app/profile/[id] currently show posts but do not wire delete. Add it.

Admin check:

Determine admin once per page (query profiles.role for current user id)

Author check:

post.author_id === currentUserId

Done when

Deleting from feed works (still).

Deleting from /app/me works and updates list.

Deleting from /app/profile/[id] works only for:

your own posts, or

admin deleting anyone’s posts

npm run build passes.