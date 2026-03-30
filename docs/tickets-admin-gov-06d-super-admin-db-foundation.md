# ADMIN-GOV-06D — Super-admin DB foundation

## Goal
Create the persistent backend foundation for super-admins using a dedicated `super_admins` table, while keeping the existing env-based allowlist as bootstrap/fallback.

## Why
The current env-based super-admin model is useful for bootstrapping the first super-admin, but it does not support runtime-managed creation of additional super-admins. The system now needs a DB-backed source of truth so super-admins can create other super-admins later through the app.

## Final model after this ticket
Super-admin status should be considered true if:
1) the user is in the env-based bootstrap allowlist, OR
2) the user exists in the `super_admins` table

This ticket only creates the backend foundation. It does not yet add the grant/revoke mobile UI.

## Scope
This ticket should cover:
1) create `super_admins` table
2) add safe RLS/policy foundation
3) add helper functions or query helpers as needed
4) add mobile/shared reading support for DB-backed super-admin status
5) preserve env allowlist as bootstrap/fallback

## Explicitly included
- Supabase SQL migration or SQL script
- `super_admins` table
- secure ownership metadata if useful
- backend-safe read/write foundation
- mobile/shared helper updates if needed to support reading DB + env

## Explicitly NOT included
- No mobile grant/revoke UI yet
- No web alignment
- No audit log yet
- No full backend cross-admin enforcement yet
- No schema role expansion (no `super_admin` role value in profiles.role)

## Important implementation note
This ticket must preserve the blueprint decision:
- super-admin is an overlay, not a new role
- database role remains `admin`
- `profiles.role` does not change
- user-facing UI still says Admin / Instructor where relevant

Recommended model:
- `super_admins.user_id uuid primary key references auth/profiles user id`
- optional metadata:
  - `created_at`
  - `created_by`

Important safety rules:
- env-based bootstrap super-admin remains valid even if not yet inserted into the table
- DB-backed super-admins can exist in addition to env-based bootstrap super-admins
- no fail-open behavior

## Existing context
Already working:
- super-admin blueprint
- shared/mobile env-based `isSuperAdmin()` utility
- mobile super-admin-aware UI guards
- current admin governance rules

## Expected behavior after this ticket
### Backend
- A `super_admins` table exists
- Database can persist super-admin identities

### Code
- The app can be extended next to check both:
  - env bootstrap allowlist
  - database table membership

### Not yet in this ticket
- no mobile screen/button to add/remove super-admins yet

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT introduce a new `super_admin` profile role
- Keep internal role model unchanged
- Keep env-based bootstrap support
- Keep implementation safe and minimal

## Files likely to touch
- docs/tickets-admin-gov-06d-super-admin-db-foundation.md
- supabase/migrations/* (new migration)
- packages/shared/src/* or apps/mobile/src/lib/* if helper reading logic is added now
- docs/related admin governance docs if needed

## Acceptance criteria
- `super_admins` table exists via migration/SQL
- safe base RLS/policy foundation exists
- current env bootstrap model is preserved
- no profile role/schema expansion is introduced
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit

## Manual test
1) Run the SQL/migration in Supabase
2) Verify the table exists
3) Insert at least one test row if instructed
4) Confirm current app still builds
5) Confirm no existing admin behavior regresses