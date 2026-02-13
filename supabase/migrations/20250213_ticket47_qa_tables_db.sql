-- Ticket 47: Q&A Tables (DB only) — questions + answers with RLS

-- ============================================================
-- 1) Helper: reusable updated_at trigger function
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 2) questions table
-- ============================================================
create table if not exists public.questions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body             text not null,
  author_id        uuid not null references public.profiles(id) on delete cascade,
  target_tutor_id  uuid null     references public.profiles(id) on delete set null,
  target_course_id uuid null     references public.courses(id)  on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- indexes
create index if not exists idx_questions_author_id  on public.questions(author_id);
create index if not exists idx_questions_created_at  on public.questions(created_at);

-- updated_at trigger
create trigger trg_questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ============================================================
-- 3) answers table
-- ============================================================
create table if not exists public.answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  body        text not null,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- indexes
create index if not exists idx_answers_question_id on public.answers(question_id);

-- updated_at trigger
create trigger trg_answers_updated_at
  before update on public.answers
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4) Enable RLS
-- ============================================================
alter table public.questions enable row level security;
alter table public.answers   enable row level security;

-- ============================================================
-- 5) RLS policies — questions
-- ============================================================

-- SELECT: any authenticated user
drop policy if exists "Authenticated users can view questions" on public.questions;
create policy "Authenticated users can view questions"
  on public.questions for select
  to authenticated
  using (true);

-- INSERT: authenticated, must be own row
drop policy if exists "Authenticated users can insert own questions" on public.questions;
create policy "Authenticated users can insert own questions"
  on public.questions for insert
  to authenticated
  with check (author_id = auth.uid());

-- UPDATE: author only
drop policy if exists "Authors can update own questions" on public.questions;
create policy "Authors can update own questions"
  on public.questions for update
  to authenticated
  using  (author_id = auth.uid())
  with check (author_id = auth.uid());

-- DELETE: author OR admin
drop policy if exists "Author or admin can delete questions" on public.questions;
create policy "Author or admin can delete questions"
  on public.questions for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ============================================================
-- 6) RLS policies — answers
-- ============================================================

-- SELECT: any authenticated user
drop policy if exists "Authenticated users can view answers" on public.answers;
create policy "Authenticated users can view answers"
  on public.answers for select
  to authenticated
  using (true);

-- INSERT: tutor or admin only, must be own row
drop policy if exists "Tutors and admins can insert answers" on public.answers;
create policy "Tutors and admins can insert answers"
  on public.answers for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'tutor'))
  );

-- UPDATE: author only
drop policy if exists "Authors can update own answers" on public.answers;
create policy "Authors can update own answers"
  on public.answers for update
  to authenticated
  using  (author_id = auth.uid())
  with check (author_id = auth.uid());

-- DELETE: author OR admin
drop policy if exists "Author or admin can delete answers" on public.answers;
create policy "Author or admin can delete answers"
  on public.answers for delete
  to authenticated
  using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
