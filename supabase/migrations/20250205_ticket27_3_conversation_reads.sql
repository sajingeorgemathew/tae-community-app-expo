-- Ticket 27.3: Add conversation_reads table to track read state per user
-- This enables "unread" indicators (dot + bold) in the conversation list

-- =========================
-- 1) CREATE TABLE
-- =========================
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index idx_conversation_reads_user_id
  on public.conversation_reads(user_id);

-- =========================
-- 2) ENABLE RLS
-- =========================
alter table public.conversation_reads enable row level security;

-- =========================
-- 3) RLS POLICIES
-- =========================

-- Users can only read their own read-status rows
create policy "Users can read own conversation reads"
  on public.conversation_reads for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own read-status rows
create policy "Users can insert own conversation reads"
  on public.conversation_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own read-status rows
create policy "Users can update own conversation reads"
  on public.conversation_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
