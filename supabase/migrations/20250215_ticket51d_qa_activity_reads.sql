-- Ticket 51(D): Q&A Activity Badge — qa_activity_reads table
-- Tracks when each user last visited /app/questions so the dashboard
-- can show a badge with new Q&A activity count.

-- ============================================================
-- 1) qa_activity_reads table
-- ============================================================
create table if not exists public.qa_activity_reads (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at trigger (reuses set_updated_at from ticket 47)
create trigger trg_qa_activity_reads_updated_at
  before update on public.qa_activity_reads
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) Enable RLS
-- ============================================================
alter table public.qa_activity_reads enable row level security;

-- ============================================================
-- 3) RLS policies
-- ============================================================

-- SELECT: user can read own row only
create policy "Users can read own qa_activity_reads"
  on public.qa_activity_reads for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT: user can insert own row only
create policy "Users can insert own qa_activity_reads"
  on public.qa_activity_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: user can update own row only
create policy "Users can update own qa_activity_reads"
  on public.qa_activity_reads for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: admin only
create policy "Admins can delete qa_activity_reads"
  on public.qa_activity_reads for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
