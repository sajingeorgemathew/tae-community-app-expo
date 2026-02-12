# Ticket 41 — Tutor role + listing flag (DB only)

## Goal
Add tutor role support + listing flag for faculty directory foundation.

## Scope
- Add column: profiles.is_listed_as_tutor boolean not null default false
- Add CHECK constraint for profiles.role: ('member','tutor','admin')
- Update RLS for profiles:
  - Only admin can update role
  - Only admin can update is_listed_as_tutor
- No UI.

## Migration file
`supabase/migrations/20250211_ticket41_tutor_role_listing_db.sql`

## Manual Supabase steps
1. Open hosted Supabase project → SQL Editor.
2. Paste the full contents of the migration file above and run.
3. Verify in Table Editor → profiles:
   - `is_listed_as_tutor` column exists (boolean, default false).
   - Constraints tab shows `profiles_role_check`.
4. Verify in Auth → Policies → profiles:
   - New policy "Admins can update any profile" appears alongside existing policies.

## Local test checklist
1. **Column exists**: `select is_listed_as_tutor from profiles limit 1;` — returns false.
2. **CHECK constraint**: `update profiles set role='invalid' where id='<any>';` — fails with CHECK violation.
3. **Tutor role accepted**: `update profiles set role='tutor' where id='<any>';` — succeeds (as admin).
4. **Member cannot set role**: Sign in as member, run `supabase.from('profiles').update({ role: 'tutor' }).eq('id', ownId)` — should fail (RLS).
5. **Member cannot set is_listed_as_tutor**: Same as above with `{ is_listed_as_tutor: true }` — should fail.
6. **Admin can set role**: Sign in as admin, update another user's role to 'tutor' — succeeds.
7. **Admin can set is_listed_as_tutor**: Sign in as admin, set `is_listed_as_tutor=true` for another user — succeeds.
8. **Existing member updates work**: Sign in as member, update own headline/skills/avatar — still succeeds.

## Notes
- The existing "Admins can update is_disabled" policy (ticket 30) remains. The new
  "Admins can update any profile" policy is a superset; both coexist safely (Postgres
  ORs multiple UPDATE policies). The old policy can be dropped in a future cleanup.
- No TS type changes needed: all `role` fields are typed `string | null`, not a
  restricted union. No constants hardcode `'member' | 'admin'` only.