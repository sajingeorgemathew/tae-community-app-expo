# ADMIN-GOV-06E — Super-admin grant/revoke system

## Goal
Implement the first runtime-managed super-admin grant/revoke system using the `super_admins` table, secure backend functions, and mobile UI controls.

## Why
The app can currently:
- detect super-admin via env/bootstrap and mobile utility
- use UI guards differently for super-admins

But there is not yet a runtime-managed way for a super-admin to create another super-admin or revoke one. This ticket adds that system.

## Scope
This ticket should cover:
1) secure backend grant/revoke foundation for `super_admins`
2) clear SQL/migration output for hosted Supabase
3) mobile UI to grant/revoke super-admin
4) safety rules to prevent obvious lockout mistakes

## Explicitly included
### Backend
- secure SQL functions / RPCs for:
  - grant super-admin
  - revoke super-admin
- permissions so only a super-admin can perform those actions
- fail-closed behavior if caller is not super-admin

### Mobile UI
- super-admin-only controls in the admin member detail flow
- clear grant/revoke affordance
- confirmation prompts
- refresh after success

### Safety rules
At minimum, design for:
- only super-admin can grant/revoke
- non-super-admin cannot write to `super_admins`
- regular admins cannot elevate users
- avoid unsafe self-revoke / last-super-admin removal if practical

## Explicitly NOT included
- No apps/web alignment yet
- No audit log yet
- No new profile role values
- No schema expansion beyond what is needed for secure runtime grant/revoke
- No full analytics or admin activity dashboard

## Important implementation note
Claude must:
- inspect the current `super_admins` table foundation
- inspect the existing mobile admin member detail flow
- preserve the blueprint model:
  - super-admin is an overlay
  - DB role remains `admin`
  - internal schema remains unchanged
  - env bootstrap path remains valid

### Critical output requirement
Claude must produce migration(s) and/or SQL in a way that is easy to run manually in hosted Supabase.

If SQL is needed for the user to run manually, Claude should:
- clearly separate the SQL code from explanation
- place SQL in migration file(s)
- make it easy to copy from the created file(s)

## Existing context
Already working:
- `super_admins` table exists
- env-based bootstrap super-admin works
- mobile isSuperAdmin utility exists
- mobile super-admin UI awareness exists
- admin member detail controls already exist

## Expected behavior
### Backend
- a super-admin can securely grant super-admin to another admin
- a super-admin can securely revoke super-admin from another super-admin/admin (subject to safety checks)
- non-super-admin callers are blocked server-side

### Mobile UI
- when a super-admin views a member/admin detail, they can grant/revoke super-admin if appropriate
- regular admins do not see working super-admin grant/revoke controls
- UI updates after success

## Technical constraints
- Do NOT change apps/web behavior
- Keep changes focused to Supabase migration/RPC + apps/mobile
- Do NOT introduce a `super_admin` value in `profiles.role`
- Keep user-facing terminology stable
- Keep implementation safe and minimal

## Files likely to touch
- docs/tickets-admin-gov-06e-super-admin-grant-revoke.md
- supabase/migrations/* (new migration(s))
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx
- apps/mobile/src/lib/* helper files if needed

## Acceptance criteria
- secure grant/revoke backend path exists
- super-admin-only mobile controls exist
- regular admins cannot grant/revoke super-admin
- current admin functionality remains stable
- SQL is clearly available for hosted Supabase execution
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Ensure your bootstrap super-admin is active
2) Open admin member detail as super-admin
3) Grant super-admin to another admin
4) Confirm it succeeds
5) Revoke super-admin from another super-admin/admin if allowed
6) Confirm regular admin cannot perform the same action