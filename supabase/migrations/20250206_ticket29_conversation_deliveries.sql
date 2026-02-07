-- Ticket 29: WhatsApp-style message ticks (sent / delivered / read)
-- New table: conversation_deliveries tracks when a user last fetched a thread

-- =========================
-- 1) CREATE TABLE
-- =========================
create table public.conversation_deliveries (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_delivered_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index idx_conversation_deliveries_user_id
  on public.conversation_deliveries(user_id);

-- =========================
-- 2) ENABLE RLS
-- =========================
alter table public.conversation_deliveries enable row level security;

-- =========================
-- 3) RLS POLICIES — conversation_deliveries
-- =========================

-- Members of a conversation can read each other's delivery rows
-- (needed so User A can see whether User B has received messages)
create policy "Members can read conversation deliveries"
  on public.conversation_deliveries for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_members.conversation_id = conversation_deliveries.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );

-- Users can insert their own delivery rows
create policy "Users can insert own delivery"
  on public.conversation_deliveries for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own delivery rows
create policy "Users can update own delivery"
  on public.conversation_deliveries for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =========================
-- 4) ADDITIONAL SELECT POLICY on conversation_reads
--    So User A can read User B's last_read_at for tick rendering
-- =========================
create policy "Members can read conversation reads"
  on public.conversation_reads for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_members.conversation_id = conversation_reads.conversation_id
        and conversation_members.user_id = auth.uid()
    )
  );
