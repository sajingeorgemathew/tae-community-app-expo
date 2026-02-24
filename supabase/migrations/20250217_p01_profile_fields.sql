-- P-01: Add profile detail columns (nullable text, no defaults)
alter table public.profiles
  add column if not exists current_work text null;

alter table public.profiles
  add column if not exists qualifications text null;

alter table public.profiles
  add column if not exists experience text null;
