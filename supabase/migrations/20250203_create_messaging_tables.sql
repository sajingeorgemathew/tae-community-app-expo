-- Ticket 24: Messaging DB foundation (RESET + RECREATE, hosted-safe)
-- Fixes ERROR 42P01 by dropping tables first (CASCADE) instead of dropping policies on missing tables.

-- =========================
-- 0) DROP STORAGE POLICIES (safe)
-- =========================
drop policy if exists "Members can view message media" on storage.objects;
drop policy if exists "Members can upload message media" on storage.objects;
drop policy if exists "Message sender can delete media" on storage.objects;

-- =========================
-- 1) DROP TABLES (dependency-safe)
--    CASCADE removes policies/indexes/FKs automatically
-- =========================
drop table if exists public.message_attachments cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversation_members cascade;
drop table if exists public.conversations cascade;

-- =========================
-- 2) DROP HELPER FUNCTION (safe)
-- =========================
drop function if exists public.extract_conversation_id_from_path(text);

-- =========================
-- 3) RECREATE HELPER FUNCTION
-- Expected path: messages/{conversation_id}/{message_id}/{filename}
-- =========================
create function public.extract_conversation_id_from_path(path text)
returns uuid
language plpgsql
stable
security definer
as $$
declare
  parts text[];
  conv_id text;
begin
  parts := string_to_array(path, '/');

  if array_length(parts, 1) < 3 or parts[1] != 'messages' then
    return null;
  end if;

  conv_id := parts[2];

  begin
    return conv_id::uuid;
  exception when invalid_text_representation then
    return null;
  end;
end;
$$;

-- =========================
-- 4) TABLES
-- =========================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index idx_conversation_members_user_id
  on public.conversation_members(user_id);

create index idx_conversation_members_conversation_id
  on public.conversation_members(conversation_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation_created
  on public.messages(conversation_id, created_at);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  type text not null check (type in ('image','video')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  constraint unique_storage_path unique (storage_path)
);

create index idx_message_attachments_message_id
  on public.message_attachments(message_id);

-- =========================
-- 5) ENABLE RLS
-- =========================
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;

-- =========================
-- 6) RLS POLICIES (no admin bypass)
-- =========================

-- conversations
create policy "Members can read their conversations"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

create policy "Authenticated can create conversations"
  on public.conversations for insert
  to authenticated
  with check (true);

-- conversation_members
create policy "Users can read own memberships"
  on public.conversation_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own membership"
  on public.conversation_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can delete own membership"
  on public.conversation_members for delete
  to authenticated
  using (user_id = auth.uid());

-- messages
create policy "Members can read conversation messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

create policy "Sender can delete own messages"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());

-- message_attachments
create policy "Members can read message attachments"
  on public.message_attachments for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_attachments.message_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Message sender can add attachments"
  on public.message_attachments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages m
      join public.conversation_members cm
        on cm.conversation_id = m.conversation_id
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
        and cm.user_id = auth.uid()
    )
  );

create policy "Message sender can delete attachments"
  on public.message_attachments for delete
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  );

-- =========================
-- 7) STORAGE BUCKET: message-media (private)
-- =========================
insert into storage.buckets (id, name, public)
values ('message-media', 'message-media', false)
on conflict (id) do nothing;

-- =========================
-- 8) STORAGE POLICIES
-- =========================

create policy "Members can view message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.conversation_members
      where conversation_id = public.extract_conversation_id_from_path(name)
        and user_id = auth.uid()
    )
  );

create policy "Members can upload message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and name like 'messages/%'
    and public.extract_conversation_id_from_path(name) is not null
    and exists (
      select 1
      from public.conversation_members
      where conversation_id = public.extract_conversation_id_from_path(name)
        and user_id = auth.uid()
    )
  );

create policy "Message sender can delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.message_attachments ma
      join public.messages m on m.id = ma.message_id
      where ma.storage_path = name
        and m.sender_id = auth.uid()
    )
  );
