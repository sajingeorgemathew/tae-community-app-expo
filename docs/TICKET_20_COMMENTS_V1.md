Ticket 20 — Comments v1 (flat + edit + delete)

Goal
Add minimal flat comments with edit + delete permissions.

DB (Supabase)
Create table: public.post_comments
- id uuid pk default gen_random_uuid()
- post_id uuid fk -> public.posts(id) on delete cascade
- author_id uuid fk -> public.profiles(id) on delete cascade
- content text not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

Notes
- updated_at should update on edits (either app sets it, or use a trigger; MVP can set from app).

RLS policies (must be enabled)
- SELECT: authenticated can read all comments
- INSERT: authenticated can insert only own (author_id = auth.uid())
- UPDATE: authenticated can update only own (author_id = auth.uid())
- DELETE: author can delete own OR admin can delete any
  (admin is profiles.role = 'admin')

App changes
Use existing PostCard (preferred) to keep UI consistent.

PostCard must support:
- Showing comments for a post (latest first or oldest first — pick one and be consistent)
- Add comment form (text input + submit)
- Inline edit own comment:
  - Edit mode shows textarea/input + Save + Cancel
  - Save updates content and updated_at
- Delete comment:
  - Visible to comment author
  - Visible to admin for any comment
- Keep UI minimal; no threading

Data loading rules
- When rendering posts lists (feed/me/profile), each PostCard can fetch its own comments (simple MVP)
  OR pages can bulk-load comments for all posts (better but more code). MVP can do per-card.
- Must work with current auth + RLS (no service role key in browser).

Done when
- Users can add comments and see them immediately
- Users can edit/delete their own comments
- Admin can delete any comments
- Refresh persists
- npm run build passes
