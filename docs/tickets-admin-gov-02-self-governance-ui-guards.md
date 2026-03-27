# ADMIN-GOV-02 — Implement self-governance UI guards

## Goal
Implement the self-governance UI rules defined in the admin governance blueprint for the mobile admin member detail surface.

## Why
The current mobile admin member detail allows risky self-actions that should be blocked or constrained by policy. The governance blueprint already decided the intended behavior, so now we need to enforce it in the mobile UI.

## Governance rules to enforce
For the current admin viewing their own account:
- self-disable: blocked
- self-role-change: blocked
- self Instructor listing toggle: allowed

Additional rule:
- Instructor listing should only be meaningful when the internal role is `tutor`
- if role is not `tutor`, the Instructor listing control should be disabled or clearly not applicable
- if changing another member away from `tutor`, the UI should behave safely and not leave an inconsistent Instructor listing state

## Scope
This ticket should cover:
1) block self-role-change in admin member detail
2) keep self-disable blocked
3) allow self Instructor toggle
4) ensure Instructor toggle is only active/meaningful when role is `tutor`
5) add clear UI messaging so admins understand why some controls are blocked

## Explicitly included
- self-governance UI restrictions
- explanatory UI text / badges / helper messages
- safer Instructor toggle behavior tied to role semantics
- keep existing admin member detail functionality stable

## Explicitly NOT included
- No backend/RLS enforcement yet
- No cross-admin protection yet
- No super-admin implementation yet
- No apps/web behavior changes
- No backend migrations/policies
- No audit logging

## Important implementation note
Claude must inspect the current AdminMemberDetail screen and current role/listing controls.

Use the governance blueprint decisions:
- self-role-change blocked
- self-disable blocked
- self Instructor toggle allowed
- Instructor listing is cosmetic/display-oriented and only meaningful when internal role is `tutor`

Claude should preserve internal schema/contracts:
- user-facing UI says "Instructor"
- internal field can remain `is_listed_as_tutor`
- internal role value can remain `tutor`

If the current detail screen allows selecting a role that is not `tutor`, the Instructor listing control should become disabled/not applicable for that selected role.

## Existing context
Already working:
- ADMIN-02 member list + member detail
- self-disable protection already exists
- governance blueprint exists
- admin shell exists
- role/instructor/disable controls already function

## Expected behavior
### When admin views their own account
- role control is visible but disabled/blocked
- disable control is blocked
- Instructor listing toggle can remain usable
- clear message explains the self-protection rules

### When admin views another normal member
- role control works
- Instructor listing toggle works subject to role semantics
- disable/enable works

### Instructor toggle semantics
- if selected/current role is not `tutor`, Instructor listing control should not behave as an active meaningful toggle
- UI should make this clear
- do not create inconsistent display states

## Technical constraints
- Do NOT change apps/web behavior
- Do NOT add backend migrations/policies
- Keep changes focused to apps/mobile
- Reuse current admin/member detail patterns where practical
- Keep UI simple and stable, not final polished

## Files likely to touch
- apps/mobile/src/screens/AdminMemberDetailScreen.tsx
- docs/tickets-admin-gov-02-self-governance-ui-guards.md
- docs/admin-role-governance-blueprint.md (only if a tiny note/update is needed)

## Acceptance criteria
- Self-role-change is blocked in mobile UI
- Self-disable remains blocked
- Self Instructor toggle remains allowed
- Instructor toggle is only meaningful when role is `tutor`
- Clear helper/disclaimer text explains blocked actions
- Existing admin member detail remains stable
- web typecheck still passes
- mobile TypeScript still passes

## Verification commands
From repo root:
- npm run web:typecheck

From apps/mobile:
- npx tsc --noEmit
- npx expo start --clear

## Manual test
1) Sign in as admin
2) Open your own member detail
3) Confirm role change is blocked
4) Confirm disable is blocked
5) Confirm Instructor listing toggle is still usable
6) Open another member detail
7) Confirm role change still works there
8) Confirm Instructor toggle behaves sensibly relative to role