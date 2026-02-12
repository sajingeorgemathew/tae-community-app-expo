-- Ticket 44: Courses + Tutor Assignment DB (schema + RLS only)

-- 1) Create courses table
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  title      text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Create tutor_course_assignments table
create table if not exists public.tutor_course_assignments (
  id         uuid primary key default gen_random_uuid(),
  tutor_id   uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutor_id, course_id)
);

-- 3) Indexes
create index if not exists idx_tutor_course_assignments_tutor_id
  on public.tutor_course_assignments(tutor_id);

create index if not exists idx_tutor_course_assignments_course_id
  on public.tutor_course_assignments(course_id);

-- 4) Enable RLS
alter table public.courses enable row level security;
alter table public.tutor_course_assignments enable row level security;

-- 5) Policies: courses

-- SELECT: any authenticated user
drop policy if exists "Authenticated users can view courses" on public.courses;
create policy "Authenticated users can view courses"
  on public.courses for select
  to authenticated
  using (true);

-- INSERT: admin only
drop policy if exists "Admins can insert courses" on public.courses;
create policy "Admins can insert courses"
  on public.courses for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- UPDATE: admin only
drop policy if exists "Admins can update courses" on public.courses;
create policy "Admins can update courses"
  on public.courses for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- DELETE: admin only
drop policy if exists "Admins can delete courses" on public.courses;
create policy "Admins can delete courses"
  on public.courses for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 6) Policies: tutor_course_assignments

-- SELECT: any authenticated user
drop policy if exists "Authenticated users can view tutor course assignments" on public.tutor_course_assignments;
create policy "Authenticated users can view tutor course assignments"
  on public.tutor_course_assignments for select
  to authenticated
  using (true);

-- INSERT: admin only
drop policy if exists "Admins can insert tutor course assignments" on public.tutor_course_assignments;
create policy "Admins can insert tutor course assignments"
  on public.tutor_course_assignments for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- DELETE: admin only
drop policy if exists "Admins can delete tutor course assignments" on public.tutor_course_assignments;
create policy "Admins can delete tutor course assignments"
  on public.tutor_course_assignments for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
