-- DEPLOY-02: Export profiles RLS policies to repo (source of truth)
-- Idempotent: drop-if-exists then create

-- =========================
-- 1) Enable RLS (safe to rerun)
-- =========================
alter table public.profiles enable row level security;

-- =========================
-- 2) SELECT: Authenticated users can view all profiles
-- =========================
drop policy if exists "Authenticated users can view all profiles" on public.profiles;
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- =========================
-- 3) INSERT: Users can insert their own profile
-- =========================
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- =========================
-- 4) UPDATE: Users can update their own profile
-- =========================
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- =========================
-- 5) UPDATE: Admins can update any profile
-- =========================
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =========================
-- 6) DELETE: Only admins can delete profiles
-- =========================
drop policy if exists "Only admins can delete profiles" on public.profiles;
create policy "Only admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
