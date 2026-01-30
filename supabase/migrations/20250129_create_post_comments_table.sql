-- Ticket 20: Post comments table with RLS

-- Create post_comments table
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.post_comments enable row level security;

-- SELECT: authenticated users can read all comments
create policy "Authenticated can read all comments"
  on public.post_comments for select
  to authenticated
  using (true);

-- INSERT: authenticated users can insert only for themselves
create policy "Users can insert own comments"
  on public.post_comments for insert
  to authenticated
  with check (author_id = auth.uid());

-- UPDATE: authenticated users can update only their own comments
create policy "Users can update own comments"
  on public.post_comments for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- DELETE: author can delete own OR admin can delete any
create policy "Users can delete own comments or admin any"
  on public.post_comments for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

/*
=== How to test in Supabase ===

1. Run this SQL in the Supabase SQL Editor.

2. Test SELECT (as any authenticated user):
   select * from post_comments;

3. Test INSERT comment (should succeed with own uid):
   insert into post_comments (post_id, author_id, content)
   values ('<post-id>', auth.uid(), 'Test comment');

4. Test INSERT with different author_id (should fail - RLS):
   insert into post_comments (post_id, author_id, content)
   values ('<post-id>', '00000000-0000-0000-0000-000000000000', 'Bad comment');

5. Test UPDATE own comment:
   update post_comments set content = 'Updated', updated_at = now()
   where id = '<comment-id>' and author_id = auth.uid();

6. Test UPDATE other's comment (should fail - RLS):
   update post_comments set content = 'Hacked'
   where author_id != auth.uid();

7. Test DELETE own comment:
   delete from post_comments where id = '<comment-id>' and author_id = auth.uid();

8. Test DELETE as admin (set your role to 'admin' first):
   delete from post_comments where id = '<any-comment-id>';

9. Verify policies in Dashboard → Authentication → Policies → post_comments table
*/
