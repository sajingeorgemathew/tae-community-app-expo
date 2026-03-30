# ADMIN-GOV-06C — Mobile super-admin awareness + UI guards

## Goal
Update the mobile admin UI so super-admins can perform cross-admin actions while regular admins remain blocked.

## Why
The super-admin identity foundation now exists through:
- shared `isSuperAdmin()` utility
- mobile config via `SUPER_ADMIN_IDS`

The current mobile admin UI still blocks all admins equally from modifying other admins. This ticket lifts that block for super-admins only.

## Scope
This ticket should cover:
1) consume the new mobile super-admin utility
2) update cross-admin UI guards in mobile
3) keep regular admins blocked from modifying other admins
4) allow super-admins to perform admin-to-admin actions in the mobile UI

## Explicitly included
- super-admin-aware cross-admin UI behavior
- use of `isSuperAdmin()` in mobile admin member detail flow
- helper/disclaimer text updates where useful
- preserve existing self-governance rules

## Explicitly NOT included
- No backend/RLS enforcement yet
- No Supabase SQL or migrations
- No apps/web changes
- No new role/schema changes
- No audit logging
- No new super-admin management UI

## Governance rules to implement
### Regular admin
- cannot modify another admin
- cannot disable another admin
- cannot change another admin's role

### Super-admin
- can modify another admin
- can disable another admin
- can change another admin's role

### Self-governance still applies to everyone
- no admin or super-admin can disable themselves
- no admin or super-admin can change their own role

### Instructor listing
- follow the existing governance rule already established in mobile
- keep display term "Instructor"
- keep internal tutor-based schema/contracts unchanged

## Important implementation note
Claude must inspect the current AdminMemberDetail mobile guard logic and update it to use the new `isSuperAdmin()` utility.

The intended behavior should match the super-admin blueprint:
- super-admin is an overlay on top of `role = "admin"`
- regular admins stay blocked from cross-admin controls
- super-admins are allowed through the UI

No backend guarantees exist yet in this ticket, so this is still UI-layer behavior only.

## Existing context
Already working:
- admin shell
- admin member detail controls
- self-governance UI guards
- cross-admin UI guards
- shared super-admin utility + mobile config
- super-admin blueprint

## Expected behavior
### When regular admin views another admin
- role controls blocked
- disable blocked
- explanatory text shown

### When super-admin views another admin
- role controls enabled
- disable enabled
- admin-to-admin controls available

### When admin/super-admin views self
- self role change still blocked
- self disable still blocked

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Keep UI stable and minimal
- No schema changes

## Files likely to touch
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx
- apps/mobile/src/lib/superAdmin.ts
- docs/tickets-admin-gov-06c-mobile-super-admin-ui.md

## Acceptance criteria
- Regular admins remain blocked from modifying other admins
- Super-admins can modify other admins in mobile UI
- Self-governance rules still apply to all admins
- Existing admin/member management remains stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Configure SUPER_ADMIN_IDS locally with a known admin user ID
2) Restart Expo
3) Sign in as a regular admin
4) Open another admin's detail
5) Confirm cross-admin controls remain blocked
6) Sign in as a configured super-admin
7) Open another admin's detail
8) Confirm cross-admin controls are available
9) Open your own detail
10) Confirm self-role-change and self-disable remain blocked