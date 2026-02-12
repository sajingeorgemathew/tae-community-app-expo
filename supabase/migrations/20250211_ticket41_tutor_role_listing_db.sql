-- Ticket 41: Tutor role + listing flag (DB only) - FIXED (allows existing 'alumni')

-- 1) Add is_listed_as_tutor column (idempotent)
alter table public.profiles
add column if not exists is_listed_as_tutor boolean not null default false;

-- 2) Ensure role CHECK constraint exists and allows existing roles (member/admin/alumni) + new tutor
do $$
begin
  -- If the constraint already exists, drop it so we can replace with the correct allowed set.
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    execute 'alter table public.profiles drop constraint profiles_role_check';
  end if;

  -- Add the updated constraint (includes alumni)
  execute $sql$
    alter table public.profiles
    add constraint profiles_role_check
    check (role in ('member','tutor','admin','alumni'))
  $sql$;
end
$$;

-- 3) Admin UPDATE policy for role and is_listed_as_tutor (create/replace safely)
drop policy if exists "Admins can update any profile" on public.profiles;

create policy "Admins can update any profile"
on public.profiles
for update
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