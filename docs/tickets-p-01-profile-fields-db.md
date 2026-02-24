# P-01 — Add profile fields to DB (profiles columns)

## Goal
Add nullable text columns to `public.profiles`:
- current_work
- qualifications
- experience

No UI changes.

## Why safe
- Additive + nullable columns (no breaking schema changes)
- Existing selects continue to work
- Existing RLS remains unchanged

## Implementation

Migration file: `supabase/migrations/20250217_p01_profile_fields.sql`

### SQL

```sql
-- P-01: Add profile detail columns (nullable text, no defaults)
alter table public.profiles
  add column if not exists current_work text null;

alter table public.profiles
  add column if not exists qualifications text null;

alter table public.profiles
  add column if not exists experience text null;
```

### Manual execution (Supabase Dashboard)
1. Open Supabase Dashboard → SQL Editor
2. Paste the SQL above and click **Run**
3. Proceed to verification checklist below

## Verification checklist
- [ ] Columns exist in Supabase Table Editor → `profiles` table
- [ ] Run: `select id, current_work, qualifications, experience from profiles limit 1;` — returns without error
- [ ] All three columns show as `text | nullable` with no default
- [ ] No new RLS policies were added (run `select * from pg_policies where tablename = 'profiles';` and confirm count unchanged)
- [ ] Existing app still runs — smoke test login + profile page
- [ ] Migration file committed: `supabase/migrations/20250217_p01_profile_fields.sql`
