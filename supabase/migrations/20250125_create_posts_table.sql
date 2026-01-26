-- Ticket 7: Posts table with RLS (Option A: instant publish)

-- Create posts table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  audience text not null default 'all' check (audience in ('all', 'students', 'alumni')),
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.posts enable row level security;

-- SELECT: authenticated users can read all posts
create policy "Authenticated can read all posts"
  on public.posts for select
  to authenticated
  using (true);

-- INSERT: authenticated users can insert their own posts
create policy "Users can insert own posts"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid());

-- UPDATE: users can update only their own posts
create policy "Users can update own posts"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- DELETE: author can delete own posts, admin can delete any
create policy "Users can delete own posts or admin any"
  on public.posts for delete
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
   select * from posts;

3. Test INSERT (should succeed with own uid):
   insert into posts (author_id, content)
   values (auth.uid(), 'Test post');

4. Test INSERT (should fail with different uid):
   insert into posts (author_id, content)
   values ('00000000-0000-0000-0000-000000000000', 'Fake post');

5. Test UPDATE (should succeed on own post):
   update posts set content = 'Updated' where author_id = auth.uid();

6. Test DELETE as author:
   delete from posts where id = '<your-post-id>';

7. Test DELETE as admin:
   - Set your profile role to 'admin' first
   - delete from posts where id = '<any-post-id>';

8. Verify policies in Dashboard → Authentication → Policies → posts table
*/
