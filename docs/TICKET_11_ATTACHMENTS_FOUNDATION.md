Ticket 11 — Attachments foundation (DB + Storage + RLS)

Goal
Add attachment support for posts (images/videos/links) with safe policies.

What to create

DB table: public.post_attachments
Fields:

id uuid PK default gen_random_uuid()

post_id uuid not null FK → public.posts(id) on delete cascade

uploader_id uuid not null FK → public.profiles(id) on delete cascade

type text not null check in (image,video,link)

storage_path text (nullable; used for image/video)

url text (nullable; used for link)

mime_type text (nullable)

size_bytes bigint (nullable)

created_at timestamptz not null default now()

Constraints:

If type in (image,video) then storage_path must be not null

If type = link then url must be not null

Storage bucket: post-media

Policies
A) Table RLS: enable RLS on public.post_attachments

SELECT: authenticated can read attachments (MVP: allow all authenticated)

INSERT: authenticated can insert only if uploader_id = auth.uid()

DELETE: uploader can delete own attachments OR admin can delete any

UPDATE: not needed (optional: disallow)

Admin check: exists (select 1 from public.profiles where id = auth.uid() and role='admin')

B) Storage policies (document only, then implement in Supabase UI):

Bucket post-media

Authenticated can read objects (MVP)

Authenticated can upload objects (MVP)

Delete: restricted later via app + attachment table rules (document clearly)

Limits to document (for later UI enforcement)

Images: max 5MB each (jpg/png/webp)

Videos: max 50MB each (mp4/webm)

Output

SQL migration file under supabase/migrations/

A “Supabase Dashboard steps” section for creating the bucket + storage policies

No UI changes

Done

Migration runs in Supabase successfully

post_attachments exists with RLS + policies

Bucket post-media created

Policies documented