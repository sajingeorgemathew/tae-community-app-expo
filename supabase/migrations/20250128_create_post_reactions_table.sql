-- Ticket 19: Post reactions table with RLS

-- Create post_reactions table
create table public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),

  -- Unique constraint: one user can react once per emoji per post
  constraint post_reactions_unique unique (post_id, user_id, emoji),

  -- Check constraint: only allowed emojis
  constraint post_reactions_emoji_check check (emoji in ('❤️', '👍', '😂'))
);

-- Enable RLS
alter table public.post_reactions enable row level security;

-- SELECT: authenticated users can read all reactions
create policy "Authenticated can read all reactions"
  on public.post_reactions for select
  to authenticated
  using (true);

-- INSERT: authenticated users can insert only for themselves
create policy "Users can insert own reactions"
  on public.post_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: user can delete own reaction, admin can delete any
create policy "Users can delete own reactions or admin any"
  on public.post_reactions for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- No UPDATE policy (users should toggle via delete + insert)

/*
=== How to test in Supabase ===

1. Run this SQL in the Supabase SQL Editor.

2. Test SELECT (as any authenticated user):
   select * from post_reactions;

3. Test INSERT reaction (should succeed with own uid):
   insert into post_reactions (post_id, user_id, emoji)
   values ('<post-id>', auth.uid(), '❤️');

4. Test INSERT duplicate (should fail - unique constraint):
   insert into post_reactions (post_id, user_id, emoji)
   values ('<post-id>', auth.uid(), '❤️');

5. Test INSERT invalid emoji (should fail - check constraint):
   insert into post_reactions (post_id, user_id, emoji)
   values ('<post-id>', auth.uid(), '🔥');

6. Test INSERT with different user_id (should fail - RLS):
   insert into post_reactions (post_id, user_id, emoji)
   values ('<post-id>', '00000000-0000-0000-0000-000000000000', '👍');

7. Test DELETE own reaction:
   delete from post_reactions where post_id = '<post-id>' and user_id = auth.uid() and emoji = '❤️';

8. Test DELETE as admin:
   - Set your profile role to 'admin' first
   - delete from post_reactions where id = '<any-reaction-id>';

9. Verify policies in Dashboard → Authentication → Policies → post_reactions table
*/
