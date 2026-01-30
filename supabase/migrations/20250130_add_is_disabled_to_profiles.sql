-- Add is_disabled column to profiles for soft user disabling
alter table public.profiles
add column if not exists is_disabled boolean not null default false;

-- Allow admins to update is_disabled on any profile
create policy "Admins can update is_disabled"
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
