Ticket 36 — DB + Storage foundation for profile pictures

Goal
Enable profile picture storage safely without changing UI yet.

Scope

Add columns to public.profiles:

avatar_path text null (stores storage object path)

headline text null

skills text[] not null default '{}'

Create storage bucket: profile-avatars (private)

RLS policies on storage.objects for bucket profile-avatars:

Authenticated users can read objects in this bucket (we will use signed URLs later in UI, but allow select for simplicity).

Users can insert/update/delete only their own avatar objects.

Optional helper function to enforce path ownership:

Enforce file path format: avatars/{user_id}/{filename}

Function returns true only if {user_id} matches auth.uid().

Done when

Columns exist

Bucket exists (private)

Policies prevent uploading/deleting someone else’s avatar

No app/UI code changes in this ticket