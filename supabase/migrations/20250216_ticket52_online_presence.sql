-- Ticket 52: Online Presence
-- Table to track user last-seen for "recently active" green dot.

create table public.presence (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at trigger (reuses set_updated_at from ticket 47)
create trigger trg_presence_updated_at
  before update on public.presence
  for each row execute function public.set_updated_at();

-- RLS
alter table public.presence enable row level security;

create policy "Authenticated can view presence"
  on public.presence for select
  to authenticated
  using (true);

create policy "Users can upsert own presence"
  on public.presence for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own presence"
  on public.presence for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins can delete presence"
  on public.presence for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
