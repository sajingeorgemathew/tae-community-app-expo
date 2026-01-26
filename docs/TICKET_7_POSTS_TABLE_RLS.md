Ticket 7 — Posts table + RLS (Option A: instant publish)

Goal: Create posts table with RLS for member posting + admin moderation.

Table: public.posts
Fields:

id uuid PK default gen

author_id uuid FK → public.profiles(id) on delete cascade

content text not null

audience text not null default 'all' (values: all, students, alumni)

created_at timestamptz not null default now()

Security (RLS policies)
Enable RLS on public.posts.

Policies:

SELECT: authenticated can read all posts.

INSERT: authenticated can insert only when author_id = auth.uid().

UPDATE: authenticated can update only their own posts (author_id = auth.uid()).

DELETE:

author can delete their own posts

admin can delete any post (admin = profile.role = 'admin')

Constraints:

No UI in Ticket 7.

No changes to profiles table/RLS.

Keep schema minimal.

Done when:

SQL runs successfully in Supabase

RLS is enabled on posts

policies exist and match rules